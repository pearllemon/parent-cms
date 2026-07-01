import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

export type WpAttachment = {
  postId: string;
  title: string;
  filename: string;
  originalUrl: string;
  altText: string;
};

// Parse WordPress Media WXR XML
export function parseMediaWxr(xmlText: string): WpAttachment[] {
  const attachments: WpAttachment[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/g;
  const blocks = xmlText.match(itemRe) || [];

  const grab = (block: string, tag: string): string => {
    const re = new RegExp(
      `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
      "i"
    );
    const mm = block.match(re);
    return (mm?.[1] ?? mm?.[2] ?? "").trim();
  };

  blocks.forEach((b) => {
    const postType = grab(b, "wp:post_type");
    if (postType !== "attachment") return;

    const postId = grab(b, "wp:post_id");
    const title = grab(b, "title");
    const originalUrl = grab(b, "wp:attachment_url");
    
    // Extract filename from URL
    let filename = "";
    if (originalUrl) {
      const parts = originalUrl.split("/");
      filename = parts[parts.length - 1];
    }

    // Get alt text from postmeta
    let altText = "";
    const metaRe = /<wp:postmeta\b[\s\S]*?<\/wp:postmeta>/g;
    const metas = b.match(metaRe) || [];
    metas.forEach((mb) => {
      const k = grab(mb, "wp:meta_key");
      const v = grab(mb, "wp:meta_value");
      if (k === "_wp_attachment_image_alt") {
        altText = v;
      }
    });

    if (originalUrl) {
      attachments.push({
        postId,
        title: title || filename,
        filename,
        originalUrl,
        altText: altText || title || filename
      });
    }
  });

  return attachments;
}

// Upload a single file to Supabase Storage and register it
export async function uploadMediaFile(
  file: File | Blob,
  fileName: string,
  siteId: string,
  metadata: { title?: string; altText?: string; originalUrl?: string } = {}
): Promise<string> {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${siteId}/${Date.now()}_${cleanFileName}`;

  // 1. Upload to storage
  const { error: uploadErr } = await supabase.storage
    .from("post-images")
    .upload(storagePath, file, { upsert: true, cacheControl: "3600" });

  if (uploadErr) throw uploadErr;

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("post-images")
    .getPublicUrl(storagePath);

  // 3. Register in media_library (local child/parent table)
  try {
    await supabase.from("media_library").insert({
      site_id: siteId,
      file_url: publicUrl,
      file_name: cleanFileName,
      file_size: file.size,
      mime_type: file.type || "image/png",
      alt_text: metadata.altText || metadata.title || cleanFileName
    });
  } catch (e) {
    console.warn("Failed to register in media_library:", e);
  }

  // 4. Register in image_assets (if original URL is known) to enable replacement
  if (metadata.originalUrl) {
    try {
      await supabase.from("image_assets").upsert({
        source_url: metadata.originalUrl,
        public_url: publicUrl,
        status: "done",
        alt_text: metadata.altText || null,
        title: metadata.title || null,
        format: file.type ? file.type.split("/")[1] : null,
        bytes_original: file.size,
        bytes_optimized: file.size
      }, { onConflict: "source_url" });
    } catch (e) {
      console.warn("Failed to register in image_assets:", e);
    }
  }

  return publicUrl;
}

// Unzip a media archive and upload all images, skipping already imported ones
export async function processZipMedia(
  zipFile: File,
  siteId: string,
  onProgress?: (msg: string) => void
): Promise<{ uploaded: { name: string; url: string }[]; errors: string[]; skippedCount: number }> {
  const result: { uploaded: { name: string; url: string }[]; errors: string[]; skippedCount: number } = {
    uploaded: [],
    errors: [],
    skippedCount: 0
  };

  onProgress?.("Reading ZIP archive...");
  const zip = await JSZip.loadAsync(zipFile);
  const files = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir && /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(name)
  );

  onProgress?.("Checking database for already imported media...");
  // Fetch existing filenames to avoid duplicate uploads
  const { data: existingMedia } = await supabase
    .from("media_library")
    .select("file_name")
    .eq("site_id", siteId);

  const existingNames = new Set((existingMedia || []).map(m => m.file_name?.toLowerCase()));

  onProgress?.(`Found ${files.length} image files in ZIP. Starting uploads...`);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const parts = filePath.split("/");
    const fileName = parts[parts.length - 1];
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    if (existingNames.has(cleanFileName.toLowerCase())) {
      result.skippedCount++;
      continue;
    }

    onProgress?.(`Uploading [${i + 1}/${files.length}]: ${fileName}...`);
    try {
      const fileData = zip.files[filePath];
      const blob = await fileData.async("blob");
      
      const publicUrl = await uploadMediaFile(blob, fileName, siteId);
      result.uploaded.push({ name: fileName, url: publicUrl });
      existingNames.add(cleanFileName.toLowerCase());
    } catch (e) {
      console.error(`Failed to upload ${fileName}:`, e);
      result.errors.push(`${fileName}: ${(e as Error).message}`);
    }
  }

  return result;
}

// Perform client-side matching and replacement of broken WordPress URLs
export async function repairBrokenImages(
  siteId: string,
  onProgress?: (msg: string) => void
): Promise<{ postsUpdated: number; urlsReplaced: number }> {
  let postsUpdated = 0;
  let urlsReplaced = 0;
  let activeSiteId = siteId;

  onProgress?.("Detecting active site ID from database...");
  
  // 1. Auto-detect site_id from imported_posts if needed
  try {
    const { data: firstPost } = await supabase
      .from("imported_posts")
      .select("site_id")
      .limit(1)
      .maybeSingle();
      
    if (firstPost?.site_id) {
      activeSiteId = firstPost.site_id;
      onProgress?.(`Using active site ID: ${activeSiteId}`);
    }
  } catch (e) {
    console.warn("Failed to auto-detect site_id:", e);
  }

  // 2. Auto-populate media_library from Storage bucket if empty
  try {
    onProgress?.("Checking media library database...");
    const { data: mediaCheck } = await supabase
      .from("media_library")
      .select("id")
      .eq("site_id", activeSiteId)
      .limit(1);

    if (!mediaCheck || mediaCheck.length === 0) {
      onProgress?.("Media library table is empty. Scanning storage bucket to auto-register files...");
      
      // List files in root and optimized folders
      const [{ data: rootFiles }, { data: optimizedFiles }] = await Promise.all([
        supabase.storage.from("post-images").list("", { limit: 1000 }),
        supabase.storage.from("post-images").list("optimized", { limit: 1000 })
      ]);

      const allFiles: { name: string; path: string; size: number }[] = [];
      (rootFiles || []).forEach(f => {
        if (f.name && !f.id) return; // skip folders
        allFiles.push({ name: f.name, path: f.name, size: f.metadata?.size || 0 });
      });
      (optimizedFiles || []).forEach(f => {
        allFiles.push({ name: f.name, path: `optimized/${f.name}`, size: f.metadata?.size || 0 });
      });

      if (allFiles.length > 0) {
        onProgress?.(`Found ${allFiles.length} files in storage. Registering in database...`);
        const inserts = allFiles.map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from("post-images")
            .getPublicUrl(file.path);
          
          return {
            site_id: activeSiteId,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.name.endsWith(".webp") ? "image/webp" : "image/png",
            alt_text: file.name
          };
        });

        // Insert in chunks of 100
        const CHUNK = 100;
        for (let i = 0; i < inserts.length; i += CHUNK) {
          await supabase.from("media_library").insert(inserts.slice(i, i + CHUNK));
        }
        onProgress?.(`Successfully registered ${inserts.length} storage files in database!`);
      }
    }
  } catch (e) {
    console.warn("Failed to auto-populate media_library from storage:", e);
  }

  onProgress?.("Fetching media library mappings...");
  
  // 3. Fetch all media library items for this site
  const { data: mediaItems, error: mediaErr } = await supabase
    .from("media_library")
    .select("file_url, file_name")
    .eq("site_id", activeSiteId);

  if (mediaErr) throw mediaErr;

  // 4. Fetch all image_assets mappings
  const { data: assetItems, error: assetErr } = await supabase
    .from("image_assets")
    .select("source_url, public_url")
    .eq("status", "done");

  if (assetErr) throw assetErr;

  // Create a map of filename -> publicUrl from media library
  const filenameMap = new Map<string, string>();
  (mediaItems || []).forEach((item) => {
    if (item.file_name && item.file_url) {
      filenameMap.set(item.file_name.toLowerCase(), item.file_url);
    }
  });

  // Create a map of originalUrl -> publicUrl from image_assets
  const urlMap = new Map<string, string>();
  (assetItems || []).forEach((item) => {
    if (item.source_url && item.public_url) {
      urlMap.set(item.source_url, item.public_url);
    }
  });

  onProgress?.("Fetching site posts and pages...");

  // 5. Fetch all posts/pages
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("id, title, body, elementor_data, featured_image_url, type, slug");

  if (postsErr) throw postsErr;

  // 6. Fetch all imported_posts for this site
  const { data: importedPosts, error: impErr } = await supabase
    .from("imported_posts")
    .select("id, title, body, elementor_data, featured_image_url, type, slug")
    .eq("site_id", activeSiteId);

  if (impErr) throw impErr;

  const wpUploadsRe = /https?:\/\/[^/]+\/wp-content\/uploads\/[^\s"'>]+/gi;

  const replaceInText = (text: string): { result: string; count: number } => {
    if (!text) return { result: text, count: 0 };
    let count = 0;
    const replaced = text.replace(wpUploadsRe, (match) => {
      // First try exact match in urlMap
      if (urlMap.has(match)) {
        count++;
        return urlMap.get(match)!;
      }

      // Fallback: match by filename
      const parts = match.split("/");
      const filename = parts[parts.length - 1].toLowerCase();
      
      // Remove any WordPress thumbnail dimensions like image-150x150.png -> image.png
      const cleanFilename = filename.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
      const nameWithoutExt = cleanFilename.substring(0, cleanFilename.lastIndexOf(".")) || cleanFilename;

      if (filenameMap.has(filename)) {
        count++;
        return filenameMap.get(filename)!;
      } else if (filenameMap.has(cleanFilename)) {
        count++;
        return filenameMap.get(cleanFilename)!;
      } else {
        // Prefix match: check if any storage filename starts with the original prefix
        // (e.g., "image5-15-419f5b557e.webp" starts with "image5")
        for (const [libName, libUrl] of filenameMap.entries()) {
          if (libName.startsWith(nameWithoutExt)) {
            count++;
            return libUrl;
          }
        }
      }

      return match; // no match, keep original
    });
    return { result: replaced, count };
  };

  onProgress?.("Scanning and repairing posts...");

  // 7. Update posts table
  for (const post of (posts || [])) {
    let postRewrites = 0;

    const bodyRes = replaceInText(post.body || "");
    let newBody = bodyRes.result;
    postRewrites += bodyRes.count;

    let newFeaturedUrl = post.featured_image_url;
    if (post.featured_image_url && post.featured_image_url.includes("/wp-content/uploads/")) {
      const featRes = replaceInText(post.featured_image_url);
      newFeaturedUrl = featRes.result;
      postRewrites += featRes.count;
    }

    let newElementorData = post.elementor_data;
    if (post.elementor_data) {
      try {
        const elText = JSON.stringify(post.elementor_data);
        if (elText.includes("/wp-content/uploads/")) {
          const elRes = replaceInText(elText);
          newElementorData = JSON.parse(elRes.result);
          postRewrites += elRes.count;
        }
      } catch (e) {
        console.warn("Failed to process Elementor data for post:", post.title, e);
      }
    }

    if (postRewrites > 0) {
      onProgress?.(`Repairing post: ${post.title} (${postRewrites} replacements)`);
      const { error: updateErr } = await supabase
        .from("posts")
        .update({
          body: newBody,
          featured_image_url: newFeaturedUrl,
          elementor_data: newElementorData
        })
        .eq("id", post.id);

      if (updateErr) {
        console.error(`Failed to update post ${post.title}:`, updateErr.message);
      } else {
        postsUpdated++;
        urlsReplaced += postRewrites;
      }
    }
  }

  // 8. Update imported_posts table
  for (const post of (importedPosts || [])) {
    let postRewrites = 0;

    const bodyRes = replaceInText(post.body || "");
    let newBody = bodyRes.result;
    postRewrites += bodyRes.count;

    let newFeaturedUrl = post.featured_image_url;
    if (post.featured_image_url && post.featured_image_url.includes("/wp-content/uploads/")) {
      const featRes = replaceInText(post.featured_image_url);
      newFeaturedUrl = featRes.result;
      postRewrites += featRes.count;
    }

    let newElementorData = post.elementor_data;
    if (post.elementor_data) {
      try {
        const elText = JSON.stringify(post.elementor_data);
        if (elText.includes("/wp-content/uploads/")) {
          const elRes = replaceInText(elText);
          newElementorData = JSON.parse(elRes.result);
          postRewrites += elRes.count;
        }
      } catch (e) {
        console.warn("Failed to process Elementor data for imported post:", post.title, e);
      }
    }

    if (postRewrites > 0) {
      onProgress?.(`Repairing imported post: ${post.title} (${postRewrites} replacements)`);
      const { error: updateErr } = await supabase
        .from("imported_posts")
        .update({
          body: newBody,
          featured_image_url: newFeaturedUrl,
          elementor_data: newElementorData
        })
        .eq("id", post.id);

      if (updateErr) {
        console.error(`Failed to update imported post ${post.title}:`, updateErr.message);
      } else {
        postsUpdated++;
        urlsReplaced += postRewrites;
      }
    }
  }

  return { postsUpdated, urlsReplaced };
}

// Fetch the raw image URL from the Wayback Machine
export async function getWaybackImageUrl(originalUrl: string): Promise<string | null> {
  const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(originalUrl)}`;
  try {
    const res = await fetch(apiUrl);
    const json = await res.json();
    const snapshot = json.archived_snapshots?.closest;
    if (snapshot && snapshot.available) {
      // Append 'im_' to get the raw file from the archive
      return snapshot.url.replace(/\/web\/(\d+)\//, "/web/$1im_/");
    }
  } catch (e) {
    console.error(`Error checking Wayback for ${originalUrl}:`, e);
  }
  return null;
}

// Automatically scan, download from Wayback, upload to Supabase, and repair URLs in the database
export async function importMissingImagesViaWayback(
  siteId: string,
  onProgress?: (msg: string) => void
): Promise<{ processed: number; succeeded: number; failed: number }> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let activeSiteId = siteId;

  onProgress?.("Detecting active site ID...");
  try {
    const { data: firstPost } = await supabase
      .from("imported_posts")
      .select("site_id")
      .limit(1)
      .maybeSingle();
    if (firstPost?.site_id) {
      activeSiteId = firstPost.site_id;
      onProgress?.(`Using active site ID: ${activeSiteId}`);
    }
  } catch (e) {
    console.warn("Failed to auto-detect site_id:", e);
  }

  onProgress?.("Scanning posts and pages for broken image URLs...");
  
  const [{ data: posts }, { data: importedPosts }] = await Promise.all([
    supabase.from("posts").select("body, elementor_data, featured_image_url"),
    supabase.from("imported_posts").select("body, elementor_data, featured_image_url").eq("site_id", activeSiteId)
  ]);

  const wpUploadsRe = /https?:\/\/[^/]+\/wp-content\/uploads\/[^\s"'>]+/gi;
  const uniqueUrls = new Set<string>();

  const scan = (text: string) => {
    if (!text) return;
    const matches = text.match(wpUploadsRe) || [];
    matches.forEach(url => uniqueUrls.add(url));
  };

  (posts || []).forEach(p => {
    scan(p.body);
    scan(p.featured_image_url);
    if (p.elementor_data) scan(JSON.stringify(p.elementor_data));
  });

  (importedPosts || []).forEach(p => {
    scan(p.body);
    scan(p.featured_image_url);
    if (p.elementor_data) scan(JSON.stringify(p.elementor_data));
  });

  onProgress?.(`Found ${uniqueUrls.size} unique broken WordPress URLs in database.`);
  if (uniqueUrls.size === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  // Get all existing filenames in media_library to avoid duplicate downloads
  const { data: existingMedia } = await supabase
    .from("media_library")
    .select("file_name")
    .eq("site_id", activeSiteId);

  const existingFilenames = new Set((existingMedia || []).map(m => m.file_name?.toLowerCase()));

  const urlsToCheck = Array.from(uniqueUrls);
  const urlsToImport: string[] = [];

  for (const url of urlsToCheck) {
    const filename = url.split("/").pop()?.toLowerCase() || "";
    const cleanFilename = filename.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
    const nameWithoutExt = cleanFilename.substring(0, cleanFilename.lastIndexOf(".")) || cleanFilename;

    // Check if we already have this file in the media library
    let found = false;
    if (existingFilenames.has(filename) || existingFilenames.has(cleanFilename)) {
      found = true;
    } else {
      for (const existingName of existingFilenames) {
        if (existingName.startsWith(nameWithoutExt)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      urlsToImport.push(url);
    }
  }

  onProgress?.(`Found ${urlsToImport.length} images that need to be imported. Starting Wayback recovery...`);

  for (let i = 0; i < urlsToImport.length; i++) {
    const originalUrl = urlsToImport[i];
    processed++;
    const filename = originalUrl.split("/").pop() || `image_${Date.now()}`;
    onProgress?.(`[${i + 1}/${urlsToImport.length}] Recovering: ${filename}...`);

    try {
      let waybackUrl = await getWaybackImageUrl(originalUrl);
      if (!waybackUrl) {
        // Try stripping size suffix (e.g. -768x744)
        const cleanUrl = originalUrl.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
        if (cleanUrl !== originalUrl) {
          waybackUrl = await getWaybackImageUrl(cleanUrl);
        }
      }

      if (!waybackUrl) {
        console.warn(`No Wayback snapshot for: ${originalUrl}`);
        failed++;
        continue;
      }

      const imgRes = await fetch(waybackUrl);
      if (!imgRes.ok) {
        console.warn(`Failed to download from Wayback: ${waybackUrl}`);
        failed++;
        continue;
      }

      const blob = await imgRes.blob();
      await uploadMediaFile(blob, filename, activeSiteId, {
        originalUrl,
        title: filename,
        altText: filename
      });

      succeeded++;
    } catch (e) {
      console.error(`Failed to recover ${originalUrl}:`, e);
      failed++;
    }
  }

  if (succeeded > 0) {
    onProgress?.("Rewriting URLs in database...");
    await repairBrokenImages(activeSiteId, onProgress);
  }

  return { processed, succeeded, failed };
}
