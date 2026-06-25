// Premium Default Templates Seeding Utility for Pearl Lemon CMS.
// Defines highly polished, responsive layouts for Homepage, Book a Call, Meet Our Team,
// About, Blog, Single Post, Service Page, 404, Header, and Footer.
// Interpolates active design tokens (primary color, accent color, font) into the visual trees.

import { supabase } from "@/integrations/supabase/client";

// Simple ID generator for visual tree nodes
const genId = () => Math.random().toString(36).slice(2, 9);

export async function seedDefaultTemplates(onProgress?: (msg: string) => void): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  onProgress?.("Fetching active design tokens…");
  // 1. Get active branding tokens
  let primary = "#111111";
  let accent = "#e94560";
  let font = "Inter";
  
  try {
    const { data: currentTokens } = await supabase.from("theme_tokens").select("*").limit(1).maybeSingle();
    if (currentTokens) {
      primary = currentTokens.colors?.primary || primary;
      accent = currentTokens.colors?.accent || accent;
      font = currentTokens.typography?.fontFamilyHeading || font;
    }
  } catch (e) {
    console.warn("Could not load branding tokens, using default fallback.", e);
  }

  const userId = (await supabase.auth.getUser()).data.user?.id || null;

  // Helpers to build standard structures
  const sectionNode = (bgColor: string, padding: any, elements: any[]) => ({
    id: genId(),
    elType: "section",
    settings: {
      background_color: bgColor,
      padding: padding
    },
    elements
  });

  const columnNode = (size: number, elements: any[], bgColor = "", padding = null as any) => ({
    id: genId(),
    elType: "column",
    settings: {
      _column_size: size,
      ...(bgColor ? { background_color: bgColor } : {}),
      ...(padding ? { padding } : {})
    },
    elements
  });

  const widgetNode = (widgetType: string, settings: Record<string, any>) => ({
    id: genId(),
    elType: "widget",
    widgetType,
    settings
  });

  // Dynamic template structures
  
  // ==================== HEADER LAYOUT TREE ====================
  const headerTree = [
    sectionNode("#0b0c10", { top: 8, bottom: 8, unit: "px" }, [
      columnNode(100, [
        widgetNode("html", {
          html: `<div style="display:flex; justify-content:flex-end; gap:20px; font-size:11px; color:#c5c6c7; font-family:${font}">
            <span style="display:flex; align-items:center; gap:5px;"><span style="color:${accent}">📞</span> UK: +442071833436</span>
            <span style="display:flex; align-items:center; gap:5px;"><span style="color:${accent}">📞</span> US: +16502784421</span>
            <span style="display:flex; align-items:center; gap:5px;"><span style="color:${accent}">✉️</span> info@pearllemongroup.com</span>
          </div>`
        })
      ])
    ]),
    sectionNode("#ffffff", { top: 15, bottom: 15, unit: "px" }, [
      columnNode(30, [
        widgetNode("image", {
          image: { url: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=150&q=80", alt: "Pearl Lemon Logo" },
          height: { size: 40, unit: "px" },
          align: "left"
        })
      ]),
      columnNode(45, [
        widgetNode("html", {
          html: `<div style="display:flex; justify-content:center; gap:25px; font-size:14px; font-weight:600; font-family:${font}">
            <a href="/" style="text-decoration:none; color:#333; transition:color 0.2s;">Home</a>
            <a href="/seo" style="text-decoration:none; color:#333; transition:color 0.2s;">SEO Services</a>
            <a href="/about" style="text-decoration:none; color:#333; transition:color 0.2s;">About Us</a>
            <a href="/team" style="text-decoration:none; color:#333; transition:color 0.2s;">Our Team</a>
            <a href="/blog" style="text-decoration:none; color:#333; transition:color 0.2s;">Blog</a>
          </div>`
        })
      ]),
      columnNode(25, [
        widgetNode("button", {
          text: "GET MY FREE SEO AUDIT!",
          link: { url: "/book-a-call" },
          button_background_color: accent,
          button_text_color: primary === "#111111" ? "#ffffff" : "#111111",
          align: "right"
        })
      ])
    ])
  ];

  // ==================== FOOTER LAYOUT TREE ====================
  const footerTree = [
    sectionNode("#0b0c10", { top: 60, bottom: 40, unit: "px" }, [
      columnNode(30, [
        widgetNode("image", {
          image: { url: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=150&q=80" },
          height: { size: 35, unit: "px" }
        }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:13px; color:#c5c6c7; margin-top:15px; font-family:${font}; line-height:1.6;">Increase visibility, attract qualified leads, and convert more customers with expert digital marketing and SEO services.</p>`
        })
      ]),
      columnNode(20, [
        widgetNode("heading", { title: "Services", header_size: "h4", title_color: "#ffffff", typography_font_size: { size: 16 }, typography_font_family: font }),
        widgetNode("html", {
          html: `<ul style="list-style:none; padding:0; font-size:13px; line-height:2.2; font-family:${font}">
            <li><a href="/seo/technical" style="color:#aaa; text-decoration:none; transition:color 0.2s;">Technical SEO</a></li>
            <li><a href="/seo/local" style="color:#aaa; text-decoration:none; transition:color 0.2s;">Local SEO Audit</a></li>
            <li><a href="/seo/link-building" style="color:#aaa; text-decoration:none; transition:color 0.2s;">Link Building</a></li>
            <li><a href="/seo/ppc" style="color:#aaa; text-decoration:none; transition:color 0.2s;">PPC Campaigns</a></li>
          </ul>`
        })
      ]),
      columnNode(25, [
        widgetNode("heading", { title: "Office & Contact", header_size: "h4", title_color: "#ffffff", typography_font_size: { size: 16 }, typography_font_family: font }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:13px; color:#aaa; font-family:${font}; line-height:1.8;">
            <strong>Pearl Lemon Ltd.</strong><br/>
            Kemp House, 152 – 160 City Road<br/>
            London, EC1V 2NX, UK<br/>
            <span style="color:${accent}">info@pearllemongroup.com</span>
          </p>`
        })
      ]),
      columnNode(25, [
        widgetNode("html", {
          html: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.383188981622!2d-0.08985168403212879!3d51.524589979637566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761ca94eb6c0c1%3A0xc3f83737b830d6bf!2sKemp%20House%2C%20152-160%20City%20Rd%2C%20London%20EC1V%202NX!5e0!3m2!1sen!2suk!4v1624564887358" width="100%" height="120" style="border:0; border-radius:8px; filter:grayscale(1) opacity(0.85);" allowfullscreen="" loading="lazy"></iframe>`
        })
      ])
    ]),
    sectionNode("#07080b", { top: 15, bottom: 15, unit: "px" }, [
      columnNode(50, [
        widgetNode("text-editor", {
          editor: `<p style="font-size:12px; color:#666; font-family:${font}">© 2026 Pearl Lemon Group. All Rights Reserved. Fully Managed Parent CMS.</p>`
        })
      ]),
      columnNode(50, [
        widgetNode("html", {
          html: `<div style="display:flex; justify-content:flex-end; gap:15px; font-size:12px; font-family:${font}">
            <a href="/privacy-policy" style="color:#666; text-decoration:none;">Privacy Policy</a>
            <a href="/terms-of-service" style="color:#666; text-decoration:none;">Terms of Service</a>
          </div>`
        })
      ])
    ])
  ];

  // ==================== HOMEPAGE LAYOUT TREE ====================
  const homepageTree = [
    // Hero
    sectionNode(primary === "#111111" ? "#0b0c10" : primary, { top: 90, bottom: 90, unit: "px" }, [
      columnNode(55, [
        widgetNode("heading", {
          title: "Dominate Search Results. Double Your Organic Traffic.",
          header_size: "h1",
          title_color: accent,
          typography_font_size: { size: 48, unit: "px" },
          typography_font_family: font,
          typography_font_weight: "800",
          typography_line_height: { size: 1.15 }
        }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:18px; color:#ffffff; opacity:0.95; margin-top:20px; margin-bottom:30px; font-family:${font}; line-height:1.6;">Pearl Lemon is an award-winning SEO agency in London. We build custom optimization frameworks that drive top-tier organic search rankings, high-intent leads, and explosive sales growth.</p>`
        }),
        widgetNode("button", {
          text: "BOOK YOUR FREE GROWTH STRATEGY CALL",
          link: { url: "/book-a-call" },
          button_background_color: accent,
          button_text_color: "#ffffff",
          align: "left"
        })
      ]),
      columnNode(45, [
        widgetNode("image", {
          image: { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" },
          border_radius: { size: 12, unit: "px" },
          align: "center"
        })
      ])
    ]),
    // Trust Logos
    sectionNode("#f8f9fa", { top: 35, bottom: 35, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "TRUSTED BY AMBITIOUS BRANDS WORLDWIDE",
          header_size: "h6",
          title_color: "#6b7280",
          align: "center",
          typography_font_size: { size: 12 },
          typography_font_family: font,
          typography_font_weight: "600"
        }),
        widgetNode("html", {
          html: `<div style="display:flex; justify-content:center; align-items:center; gap:50px; flex-wrap:wrap; margin-top:20px; opacity:0.5; filter:grayscale(1);">
            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&h=35&q=80" alt="Client Logo 1"/>
            <img src="https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=100&h=35&q=80" alt="Client Logo 2"/>
            <img src="https://images.unsplash.com/photo-1618005198143-e5283b519a7f?auto=format&fit=crop&w=100&h=35&q=80" alt="Client Logo 3"/>
            <img src="https://images.unsplash.com/photo-1599305445671-ac291c95aba9?auto=format&fit=crop&w=100&h=35&q=80" alt="Client Logo 4"/>
          </div>`
        })
      ])
    ]),
    // Core Services Grid
    sectionNode("#ffffff", { top: 80, bottom: 80, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "Relentless SEO Frameworks That Scale",
          header_size: "h2",
          title_color: primary,
          align: "center",
          typography_font_size: { size: 36 },
          typography_font_family: font,
          typography_font_weight: "700"
        }),
        widgetNode("text-editor", {
          editor: `<p style="text-align:center; max-w:600px; margin: 15px auto 50px auto; color:#475569; font-family:${font}">We specialize in data-driven strategies designed to maximize your digital visibility and drive real transactional revenue.</p>`
        })
      ]),
      columnNode(33, [
        widgetNode("icon-box", {
          title_text: "Technical SEO Audit",
          description_text: "Identify and resolve indexing, crawlability, and schema issues that block search bots and degrade user experience.",
          align: "center"
        })
      ], "#f8f9fa", { top: 30, right: 20, bottom: 30, left: 20, unit: "px" }),
      columnNode(33, [
        widgetNode("icon-box", {
          title_text: "Link Building Campaigns",
          description_text: "Acquire high-authority, contextual backlinks that power up your domain trust and shoot keywords to page 1.",
          align: "center"
        })
      ], "#f8f9fa", { top: 30, right: 20, bottom: 30, left: 20, unit: "px" }),
      columnNode(33, [
        widgetNode("icon-box", {
          title_text: "Local SEO Domination",
          description_text: "Dominate Google Maps pack and capture highly profitable local customer searches exactly when they buy.",
          align: "center"
        })
      ], "#f8f9fa", { top: 30, right: 20, bottom: 30, left: 20, unit: "px" })
    ]),
    // CTA Banner
    sectionNode("#0b0c10", { top: 75, bottom: 75, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "Want to outrank your biggest competitors?",
          header_size: "h2",
          title_color: "#ffffff",
          align: "center",
          typography_font_size: { size: 32 },
          typography_font_family: font,
          typography_font_weight: "700"
        }),
        widgetNode("spacer", { space: { size: 15 } }),
        widgetNode("text-editor", {
          editor: `<p style="text-align:center; color:#c5c6c7; max-width:650px; margin:0 auto 25px auto; font-family:${font}">Request a free, comprehensive SEO analysis. We'll show you exactly where you're losing traffic and how to claim it.</p>`
        }),
        widgetNode("button", {
          text: "CLAIM MY FREE SEO ACTION PLAN",
          link: { url: "/book-a-call" },
          button_background_color: accent,
          button_text_color: "#ffffff",
          align: "center"
        })
      ])
    ])
  ];

  // ==================== BOOK A CALL LAYOUT TREE ====================
  const bookACallTree = [
    sectionNode("#f8f9fa", { top: 70, bottom: 70, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "Let's Scale Your Organic Revenue",
          header_size: "h1",
          title_color: primary,
          align: "center",
          typography_font_size: { size: 40 },
          typography_font_family: font,
          typography_font_weight: "800"
        }),
        widgetNode("text-editor", {
          editor: `<p style="text-align:center; color:#4b5563; max-width:600px; margin:15px auto 0 auto; font-family:${font}">Book a 30-minute growth call with our top SEO strategist. We will audit your top pages and present a clear keyword plan.</p>`
        })
      ])
    ]),
    sectionNode("#ffffff", { top: 60, bottom: 60, unit: "px" }, [
      columnNode(45, [
        widgetNode("heading", {
          title: "What we'll map out on the call:",
          header_size: "h3",
          title_color: primary,
          typography_font_size: { size: 24 },
          typography_font_family: font,
          typography_font_weight: "700"
        }),
        widgetNode("spacer", { space: { size: 15 } }),
        widgetNode("icon-list", {
          icon_list: [
            { text: "Your site's core technical bottleneck blocking Google bots" },
            { text: "High-intent transactional keywords your competitors rank for" },
            { text: "A step-by-step roadmap to double your organic leads" },
            { text: "Full, zero-obligation analysis with transparent pricing" }
          ]
        }),
        widgetNode("spacer", { space: { size: 20 } }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:14px; color:#6b7280; font-family:${font}">No sales pitches. Just pure, actionable growth data tailored to your brand.</p>`
        })
      ]),
      columnNode(55, [
        widgetNode("html", {
          html: `<div style="border:1px solid #e2e8f0; border-radius:12px; padding:30px; background-color:#ffffff; box-shadow:0 10px 15px -3px rgba(0,0,0,0.05);">
            <div style="text-align:center; margin-bottom:20px;">
              <span style="font-size:24px;">📅</span>
              <h4 style="margin:10px 0 5px 0; font-family:${font}; font-weight:700;">Select Growth Slot</h4>
              <p style="font-size:12px; color:#64748b;">30-Min Strategy Consultation</p>
            </div>
            <hr style="border:0; border-top:1px solid #e2e8f0; margin-bottom:20px;"/>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
              <button style="padding:12px; border:1px solid #e2e8f0; border-radius:8px; background:none; cursor:pointer; font-family:${font}; font-size:13px; font-weight:500; text-align:center;">Tomorrow - 10:00 AM</button>
              <button style="padding:12px; border:1px solid #e2e8f0; border-radius:8px; background:none; cursor:pointer; font-family:${font}; font-size:13px; font-weight:500; text-align:center;">Tomorrow - 2:30 PM</button>
              <button style="padding:12px; border:1px solid #e2e8f0; border-radius:8px; background:none; cursor:pointer; font-family:${font}; font-size:13px; font-weight:500; text-align:center;">Next Day - 11:30 AM</button>
              <button style="padding:12px; border:1px solid #e2e8f0; border-radius:8px; background:none; cursor:pointer; font-family:${font}; font-size:13px; font-weight:500; text-align:center;">Next Day - 4:00 PM</button>
            </div>
            <a href="https://calendly.com" target="_blank" rel="noreferrer" style="display:block; width:100%; text-align:center; padding:14px; background-color:${accent}; color:#ffffff; font-family:${font}; font-weight:600; text-decoration:none; border-radius:8px; transition:opacity 0.2s;">Open Calendar Page</a>
          </div>`
        })
      ])
    ])
  ];

  // ==================== MEET OUR TEAM LAYOUT TREE ====================
  const meetOurTeamTree = [
    sectionNode("#0b0c10", { top: 80, bottom: 80, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "The Brains Behind the Ranks",
          header_size: "h1",
          title_color: "#ffffff",
          align: "center",
          typography_font_size: { size: 40 },
          typography_font_family: font,
          typography_font_weight: "800"
        }),
        widgetNode("text-editor", {
          editor: `<p style="text-align:center; color:#c5c6c7; max-width:600px; margin:15px auto 0 auto; font-family:${font}">Meet our group of high-performance SEO developers, copywriters, link acquisition experts, and conversion strategists.</p>`
        })
      ])
    ]),
    sectionNode("#ffffff", { top: 70, bottom: 70, unit: "px" }, [
      columnNode(33, [
        widgetNode("image-box", {
          image: { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80" },
          image_size: 140,
          title_text: "Deepika Lemon",
          description_text: "<strong>Founder & SEO Director</strong><br/>Deepika governs search strategy and execution parameters across all child sites."
        })
      ], "#f8f9fa", { top: 25, right: 20, bottom: 25, left: 20, unit: "px" }),
      columnNode(33, [
        widgetNode("image-box", {
          image: { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80" },
          image_size: 140,
          title_text: "Ted Hale",
          description_text: "<strong>Technical SEO Architect</strong><br/>Ted is a veteran automation developer specialized in indexing, crawl logs, and schemas."
        })
      ], "#f8f9fa", { top: 25, right: 20, bottom: 25, left: 20, unit: "px" }),
      columnNode(33, [
        widgetNode("image-box", {
          image: { url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=300&q=80" },
          image_size: 140,
          title_text: "Sarah Hughes",
          description_text: "<strong>Head of Outreach</strong><br/>Sarah runs link building, influencer marketing, and high-authority editorial relations."
        })
      ], "#f8f9fa", { top: 25, right: 20, bottom: 25, left: 20, unit: "px" })
    ])
  ];

  // ==================== ABOUT LAYOUT TREE ====================
  const aboutTree = [
    sectionNode("#ffffff", { top: 80, bottom: 80, unit: "px" }, [
      columnNode(55, [
        widgetNode("heading", {
          title: "We Don't Guess. We Relentlessly Test.",
          header_size: "h1",
          title_color: primary,
          typography_font_size: { size: 38 },
          typography_font_family: font,
          typography_font_weight: "800"
        }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:16px; color:#475569; margin-top:20px; line-height:1.7; font-family:${font}">
            Pearl Lemon was founded on a simple insight: traditional SEO agencies are slow, outdated, and reliant on basic strategies that Google outgrew years ago.<br/><br/>
            We operate as a high-performance SEO lab. We buy and test domains, run correlation audits, and develop proprietary software that keeps our client portfolio steps ahead of algorithm changes.
          </p>`
        })
      ]),
      columnNode(45, [
        widgetNode("image", {
          image: { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" },
          border_radius: { size: 10, unit: "px" }
        })
      ])
    ]),
    // Stats Grid
    sectionNode("#0b0c10", { top: 60, bottom: 60, unit: "px" }, [
      columnNode(25, [
        widgetNode("heading", { title: "450%+", header_size: "h2", title_color: accent, align: "center", typography_font_size: { size: 36 }, typography_font_family: font }),
        widgetNode("text-editor", { editor: `<p style="text-align:center; color:#c5c6c7; font-size:13px; font-family:${font}">Average Traffic Growth</p>` })
      ]),
      columnNode(25, [
        widgetNode("heading", { title: "200M+", header_size: "h2", title_color: "#ffffff", align: "center", typography_font_size: { size: 36 }, typography_font_family: font }),
        widgetNode("text-editor", { editor: `<p style="text-align:center; color:#c5c6c7; font-size:13px; font-family:${font}">Keywords Ranked</p>` })
      ]),
      columnNode(25, [
        widgetNode("heading", { title: "180+", header_size: "h2", title_color: accent, align: "center", typography_font_size: { size: 36 }, typography_font_family: font }),
        widgetNode("text-editor", { editor: `<p style="text-align:center; color:#c5c6c7; font-size:13px; font-family:${font}">Active SEO Experts</p>` })
      ]),
      columnNode(25, [
        widgetNode("heading", { title: "10x", header_size: "h2", title_color: "#ffffff", align: "center", typography_font_size: { size: 36 }, typography_font_family: font }),
        widgetNode("text-editor", { editor: `<p style="text-align:center; color:#c5c6c7; font-size:13px; font-family:${font}">Average Client ROI</p>` })
      ])
    ])
  ];

  // ==================== BLOG LAYOUT TREE ====================
  const blogTree = [
    sectionNode("#f8f9fa", { top: 60, bottom: 60, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "The Pearl Lemon SEO Lab",
          header_size: "h1",
          title_color: primary,
          align: "center",
          typography_font_size: { size: 38 },
          typography_font_family: font,
          typography_font_weight: "800"
        }),
        widgetNode("text-editor", {
          editor: `<p style="text-align:center; color:#475569; max-width:600px; margin:10px auto 0 auto; font-family:${font}">Actionable tutorials, case studies, and code snippets from our team of search engineers.</p>`
        })
      ])
    ]),
    sectionNode("#ffffff", { top: 65, bottom: 65, unit: "px" }, [
      columnNode(70, [
        widgetNode("html", {
          html: `<div style="display:grid; grid-template-columns:1fr 1fr; gap:30px;">
            <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
              <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&h=200&q=80" style="width:100%; height:200px; object-fit:cover;"/>
              <div style="padding:20px;">
                <p style="font-size:11px; font-weight:600; color:${accent}; text-transform:uppercase; margin-bottom:5px;">Technical SEO</p>
                <h3 style="font-size:18px; font-weight:700; margin:0 0 10px 0; font-family:${font};">The Python script we use to scrape indexing errors at scale</h3>
                <p style="font-size:13px; color:#64748b; line-height:1.5;">Learn how to build a custom crawl log scraper using Google Search Console APIs to capture immediate ranking wins.</p>
                <a href="/blog/indexing-scraper" style="display:inline-block; margin-top:15px; font-size:13px; font-weight:600; color:${primary}; text-decoration:none;">Read Post →</a>
              </div>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
              <img src="https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=400&h=200&q=80" style="width:100%; height:200px; object-fit:cover;"/>
              <div style="padding:20px;">
                <p style="font-size:11px; font-weight:600; color:${accent}; text-transform:uppercase; margin-bottom:5px;">Link Building</p>
                <h3 style="font-size:18px; font-weight:700; margin:0 0 10px 0; font-family:${font};">Link insertion guide: How we secure contextual DA 80+ mentions</h3>
                <p style="font-size:13px; color:#64748b; line-height:1.5;">A step-by-step breakdown of our email outreach sequences, follow-up parameters, and publisher verification checklist.</p>
                <a href="/blog/link-insertion-guide" style="display:inline-block; margin-top:15px; font-size:13px; font-weight:600; color:${primary}; text-decoration:none;">Read Post →</a>
              </div>
            </div>
          </div>`
        })
      ]),
      columnNode(30, [
        widgetNode("heading", { title: "Search Articles", header_size: "h4", title_color: primary, typography_font_size: { size: 16 }, typography_font_family: font }),
        widgetNode("html", {
          html: `<div style="display:flex; gap:5px; margin-bottom:25px;">
            <input type="text" placeholder="Search..." style="flex-1; padding:8px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;"/>
            <button style="padding:8px 15px; background-color:${primary}; color:#ffffff; border:none; border-radius:6px; font-size:13px; font-weight:600;">Go</button>
          </div>`
        }),
        widgetNode("heading", { title: "Categories", header_size: "h4", title_color: primary, typography_font_size: { size: 16 }, typography_font_family: font }),
        widgetNode("icon-list", {
          icon_list: [
            { text: "Technical SEO (14)" },
            { text: "Link Acquisition (22)" },
            { text: "Local Maps Optimization (9)" },
            { text: "Content Operations (18)" }
          ]
        }),
        widgetNode("spacer", { space: { size: 20 } }),
        widgetNode("text-editor", {
          editor: `<div style="background-color:${primary}; padding:20px; border-radius:8px; color:#ffffff;">
            <h5 style="margin:0 0 8px 0; font-family:${font}; font-size:16px;">Need massive organic growth?</h5>
            <p style="font-size:11px; opacity:0.8; line-height:1.5; margin-bottom:15px;">Book a free audit call and get customized strategies.</p>
            <a href="/book-a-call" style="display:inline-block; padding:8px 12px; background-color:${accent}; color:#ffffff; font-size:12px; font-weight:600; text-decoration:none; border-radius:4px;">Request Strategy Call</a>
          </div>`
        })
      ])
    ])
  ];

  // ==================== SINGLE POST LAYOUT TREE ====================
  const singlePostTree = [
    sectionNode("#ffffff", { top: 60, bottom: 40, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "Dynamic Single Post Template",
          header_size: "h1",
          title_color: primary,
          typography_font_size: { size: 42 },
          typography_font_family: font,
          typography_font_weight: "800"
        }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:13px; color:#64748b; font-family:${font}">Published by <strong>Pearl Lemon Team</strong> · Updated June 2026 · Category: <strong>SEO Optimization</strong></p>`
        })
      ])
    ]),
    sectionNode("#ffffff", { top: 0, bottom: 60, unit: "px" }, [
      columnNode(75, [
        widgetNode("image", {
          image: { url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80" },
          border_radius: { size: 8, unit: "px" }
        }),
        widgetNode("spacer", { space: { size: 20 } }),
        widgetNode("text-editor", {
          editor: `<div style="font-size:16px; line-height:1.8; color:#1e293b; font-family:${font}">
            <p><strong>This is the structural template governing all blog posts across your CMS.</strong></p>
            <p>When a child site or parent post is loaded, the actual rich text body will be dynamically injected here in place of these design blocks.</p>
            <h3>1. Clear Semantic Hierarchies</h3>
            <p>Writing detailed, long-form content is the cornerstone of search rankings. Our theme system renders h2, h3, lists, and quotes beautifully, maintaining strong readability and high dwell time.</p>
            <blockquote>"High quality content is the best sales representative you can hire. It works 24/7, never takes a holiday, and answers customer questions instantly."</blockquote>
            <h3>2. Dynamic Tables & Internal Links</h3>
            <p>Our CMS contains an internal linking algorithm that scans paragraphs, finds contextual anchor texts, and maps links automatically across the network.</p>
          </div>`
        })
      ]),
      columnNode(25, [
        widgetNode("text-editor", {
          editor: `<div style="border:1px solid #cbd5e1; padding:20px; border-radius:8px; text-align:center;">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80" style="width:80px; height:80px; border-radius:55px; object-fit:cover; margin:0 auto 10px auto; display:block;"/>
            <h4 style="margin:0; font-family:${font}; font-weight:700;">Deepika Lemon</h4>
            <p style="font-size:11px; color:#64748b; margin:2px 0 10px 0;">Founder & Lead Strategist</p>
            <p style="font-size:12px; color:#475569; line-height:1.4;">Deepika runs SEO correlation experiments and scales organic search properties globally.</p>
          </div>`
        }),
        widgetNode("spacer", { space: { size: 20 } }),
        widgetNode("heading", { title: "Share This Post", header_size: "h5", title_color: primary, typography_font_size: { size: 14 } }),
        widgetNode("social-icons", {
          social_icon_list: [
            { link: { url: "#" }, social_icon: { value: "fa-twitter" } },
            { link: { url: "#" }, social_icon: { value: "fa-linkedin" } },
            { link: { url: "#" }, social_icon: { value: "fa-facebook" } }
          ]
        })
      ])
    ])
  ];

  // ==================== SERVICE PAGE LAYOUT TREE ====================
  const servicePageTree = [
    sectionNode(primary, { top: 80, bottom: 80, unit: "px" }, [
      columnNode(60, [
        widgetNode("heading", {
          title: "Bespoke Search Campaigns Designed to Win",
          header_size: "h1",
          title_color: "#ffffff",
          typography_font_size: { size: 40 },
          typography_font_family: font,
          typography_font_weight: "800"
        }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:16px; color:#c5c6c7; margin-top:20px; margin-bottom:30px; font-family:${font}; line-height:1.6;">Maximize your brand's digital footprints, drive transactional search queries, and unlock massive organic revenue pipelines.</p>`
        }),
        widgetNode("button", {
          text: "REQUEST A FREE SEO PROPOSAL",
          link: { url: "/book-a-call" },
          button_background_color: accent,
          button_text_color: "#ffffff",
          align: "left"
        })
      ]),
      columnNode(40, [
        widgetNode("image", {
          image: { url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80" },
          border_radius: { size: 8, unit: "px" }
        })
      ])
    ]),
    sectionNode("#ffffff", { top: 70, bottom: 70, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "How Our Services Differ",
          header_size: "h2",
          title_color: primary,
          align: "center",
          typography_font_size: { size: 32 }
        })
      ]),
      columnNode(50, [
        widgetNode("heading", { title: "01. Deep Technical Audits", header_size: "h4", title_color: accent }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:14px; color:#475569; font-family:${font}">We review your log files, check JS rendering pipelines, verify structural schemas, and optimize your overall Core Web Vitals score.</p>`
        })
      ]),
      columnNode(50, [
        widgetNode("heading", { title: "02. Scale outreach", header_size: "h4", title_color: accent }),
        widgetNode("text-editor", {
          editor: `<p style="font-size:14px; color:#475569; font-family:${font}">We run a massive contextual link acquisition desk. We secure editorial placements on active domains with real search traffic.</p>`
        })
      ])
    ])
  ];

  // ==================== 404 PAGE LAYOUT TREE ====================
  const error404Tree = [
    sectionNode("#ffffff", { top: 120, bottom: 120, unit: "px" }, [
      columnNode(100, [
        widgetNode("heading", {
          title: "404",
          header_size: "h1",
          title_color: accent,
          align: "center",
          typography_font_size: { size: 100 },
          typography_font_family: font,
          typography_font_weight: "900"
        }),
        widgetNode("heading", {
          title: "Lost in Search? The page was not found.",
          header_size: "h2",
          title_color: primary,
          align: "center",
          typography_font_size: { size: 28 }
        }),
        widgetNode("spacer", { space: { size: 15 } }),
        widgetNode("text-editor", {
          editor: `<p style="text-align:center; color:#64748b; max-width:500px; margin:0 auto 30px auto; font-family:${font}">The page you are looking for doesn't exist, has been moved, or is temporarily unavailable. Let's get you back on track!</p>`
        }),
        widgetNode("html", {
          html: `<div style="max-width:400px; margin:0 auto 30px auto; display:flex; gap:8px;">
            <input type="text" placeholder="Search our site..." style="flex:1; padding:10px 15px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;"/>
            <button style="padding:10px 20px; background-color:${primary}; color:#ffffff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Search</button>
          </div>`
        }),
        widgetNode("button", {
          text: "BACK TO HOMEPAGE",
          link: { url: "/" },
          button_background_color: primary,
          button_text_color: "#ffffff",
          align: "center"
        })
      ])
    ])
  ];

  // 3. SEED THE TABLES IN BULK
  
  // A. Seed elementor_templates (Header, Footer, 404)
  onProgress?.("Seeding Elementor Layout templates…");
  try {
    const layoutTemplates = [
      {
        source_id: "global-header-layout",
        kind: "header",
        title: "Global Header Template",
        slug: "global-header",
        data: headerTree,
        source: "elementor",
        imported_by: userId
      },
      {
        source_id: "global-footer-layout",
        kind: "footer",
        title: "Global Footer Template",
        slug: "global-footer",
        data: footerTree,
        source: "elementor",
        imported_by: userId
      },
      {
        source_id: "global-404-layout",
        kind: "404",
        title: "Global 404 Error Layout",
        slug: "global-404",
        data: error404Tree,
        source: "elementor",
        imported_by: userId
      }
    ];

    for (const tpl of layoutTemplates) {
      const { error } = await supabase.from("elementor_templates").upsert(tpl, { onConflict: "source_id" });
      if (error) {
        errors.push(`Failed elementor_template upsert (${tpl.title}): ${error.message}`);
      }
    }
  } catch (e) {
    errors.push(`Elementor templates seeding failed: ${(e as Error).message}`);
  }

  // B. Seed theme_templates (Homepage, Book a Call, Meet Our Team, About, Blog, Single Post, Service Page, 404)
  onProgress?.("Seeding Theme Page templates…");
  try {
    const pageTemplates = [
      {
        slug: "home-template",
        name: "Homepage Template",
        kind: "page",
        description: "Polished homepage with a bold hero section, trust logo grid, services cards, and a massive CTA banner.",
        blocks: homepageTree,
        is_default: true,
        source: "parent"
      },
      {
        slug: "book-a-call-template",
        name: "Book a Call Template",
        kind: "page",
        description: "Premium call scheduling layout with feature lists and embedded interactive slots.",
        blocks: bookACallTree,
        is_default: false,
        source: "parent"
      },
      {
        slug: "meet-our-team-template",
        name: "Meet Our Team Template",
        kind: "page",
        description: "Showcase of company experts filtered by department with elegant social cards.",
        blocks: meetOurTeamTree,
        is_default: false,
        source: "parent"
      },
      {
        slug: "about-template",
        name: "About Us Template",
        kind: "page",
        description: "Alternating grids describing mission, vision, and core values alongside stats counters.",
        blocks: aboutTree,
        is_default: false,
        source: "parent"
      },
      {
        slug: "blog-archive-template",
        name: "Blog Archive Template",
        kind: "archive",
        description: "Blog listing page with structured card previews, search widgets, and categorical navigation.",
        blocks: blogTree,
        is_default: true,
        source: "parent"
      },
      {
        slug: "single-post-template",
        name: "Single Post Template",
        kind: "post",
        description: "Universal blog post template with sidebar author boxes, social share bars, and standard layouts.",
        blocks: singlePostTree,
        is_default: true,
        source: "parent"
      },
      {
        slug: "service-page-template",
        name: "Service Template",
        kind: "service",
        description: "Structured landing page for selling specific optimization, linking, and marketing solutions.",
        blocks: servicePageTree,
        is_default: true,
        source: "parent"
      },
      {
        slug: "error-404-template",
        name: "404 Error Page Template",
        kind: "page",
        description: "Stylized 404 layout containing organic search bars and fallback navigation links.",
        blocks: error404Tree,
        is_default: false,
        source: "parent"
      }
    ];

    for (const tpl of pageTemplates) {
      const { error } = await supabase.from("theme_templates").upsert(tpl, { onConflict: "slug" });
      if (error) {
        errors.push(`Failed theme_template upsert (${tpl.name}): ${error.message}`);
      }
    }
  } catch (e) {
    errors.push(`Theme templates seeding failed: ${(e as Error).message}`);
  }

  // C. Seed configuration tables for the Theme Builder (Header, Footer, 404, Booking)
  onProgress?.("Populating Theme Builder configurations…");
  try {
    // 1) Header Configs
    const { data: headerCheck } = await supabase.from("header_configs").select("id").limit(1);
    if (!headerCheck || headerCheck.length === 0) {
      const { data: hConf, error: hError } = await supabase.from("header_configs").insert({
        name: "Default Header",
        logo_url: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=150&q=80",
        logo_alt: "Pearl Lemon",
        tagline: "FOR WHEN LIFE GIVES YOU..",
        cta_text: "BOOK A CALL",
        cta_link: "/book-a-call",
        sticky_header: true,
        transparent_mode: false,
        show_progress_bar: true,
      }).select().single();
      
      if (hConf && !hError) {
        // Add default nav items
        const navs = [
          { header_config_id: hConf.id, label: "Home", href: "/", sort_order: 0 },
          { header_config_id: hConf.id, label: "SEO Services", href: "/seo", sort_order: 1 },
          { header_config_id: hConf.id, label: "About Us", href: "/about", sort_order: 2 },
          { header_config_id: hConf.id, label: "Our Team", href: "/team", sort_order: 3 },
          { header_config_id: hConf.id, label: "Blog", href: "/blog", sort_order: 4 },
        ];
        await supabase.from("nav_items").insert(navs);
      }
    }

    // 2) Footer Configs
    const { data: footerCheck } = await supabase.from("footer_configs").select("id").limit(1);
    if (!footerCheck || footerCheck.length === 0) {
      const { data: fConf, error: fError } = await supabase.from("footer_configs").insert({
        name: "Default Footer",
        logo_url: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=150&q=80",
        logo_alt: "Pearl Lemon",
        description: "Increase visibility, attract qualified leads, and convert more customers with expert SEO services.",
        copyright_text: "© 2026. All Rights Reserved",
        company_info: "Pearl Lemon Ltd. Kemp House, 152 – 160 City Road, London",
        map_embed_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2482.383188981622!2d-0.08985168403212879!3d51.524589979637566!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761ca94eb6c0c1%3A0xc3f83737b830d6bf!2sKemp%20House%2C%20152-160%20City%20Rd%2C%20London%20EC1V%202NX!5e0!3m2!1sen!2suk!4v1624564887358",
        show_map: true,
        show_locations: true,
        show_form: true,
        form_heading: "Get In Touch",
      }).select().single();
      
      if (fConf && !fError) {
        const columns = [
          { footer_config_id: fConf.id, heading: "Quick Links", sort_order: 0 },
          { footer_config_id: fConf.id, heading: "Our Agency", sort_order: 1 }
        ];
        const { data: colsData } = await supabase.from("footer_columns").insert(columns).select();
        if (colsData) {
          const links = [];
          const col1 = colsData.find(c => c.heading === "Quick Links");
          if (col1) {
            links.push(
              { column_id: col1.id, label: "SEO Services", href: "/seo", sort_order: 0 },
              { column_id: col1.id, label: "Book a Call", href: "/book-a-call", sort_order: 1 },
              { column_id: col1.id, label: "Our Blog", href: "/blog", sort_order: 2 }
            );
          }
          const col2 = colsData.find(c => c.heading === "Our Agency");
          if (col2) {
            links.push(
              { column_id: col2.id, label: "About Pearl Lemon", href: "/about", sort_order: 0 },
              { column_id: col2.id, label: "Meet the Team", href: "/team", sort_order: 1 },
              { column_id: col2.id, label: "Contact Us", href: "/contact", sort_order: 2 }
            );
          }
          if (links.length) {
            await supabase.from("footer_links").insert(links);
          }
        }
      }
    }

    // 3) Error Page Configs
    const { data: errorCheck } = await supabase.from("error_page_configs").select("id").limit(1);
    if (!errorCheck || errorCheck.length === 0) {
      await supabase.from("error_page_configs").insert({
        name: "Default 404",
        heading: "Oooops...",
        subheading: "Page not found",
        description: "The page you are looking for doesn't exist or other error occurred.",
        show_search: true,
        show_lead_form: true,
        search_placeholder: "What page you were looking for?",
        cta_text: "Go Back to Homepage",
      });
    }

    // 4) Booking Page Configs
    const { data: bookingCheck } = await supabase.from("booking_page_configs").select("id").limit(1);
    if (!bookingCheck || bookingCheck.length === 0) {
      await supabase.from("booking_page_configs").insert({
        heading: "Book A Call",
        subheading: "Schedule a meeting with our team",
        team_heading: "Meet Our Team",
        calendar_embed_code: "<iframe src='https://calendly.com' width='100%' height='600'></iframe>",
        is_global: true
      });
    }
  } catch (e) {
    errors.push(`Theme Builder configs seeding failed: ${(e as Error).message}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}
