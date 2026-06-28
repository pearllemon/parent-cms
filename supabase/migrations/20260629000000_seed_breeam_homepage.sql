-- Seed BREEAM homepage on BREEAM child site
DO $$
DECLARE
    v_site_id TEXT;
    v_html_body TEXT := '<div class="space-y-20 pb-12">
  <!-- Hero Section -->
  <section class="relative bg-slate-900 text-white py-24 px-6 overflow-hidden">
    <div class="absolute inset-0 opacity-25 bg-[url(''https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'')] bg-cover bg-center"></div>
    <div class="relative max-w-5xl mx-auto space-y-6 text-center">
      <span class="inline-block text-xs font-bold uppercase tracking-widest text-orange-500">UK Sustainable Certification</span>
      <h1 class="text-4xl md:text-6xl font-extrabold font-display tracking-tight leading-tight max-w-4xl mx-auto">
        BREEAM Assessment & Sustainability Services
      </h1>
      <p class="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
        Expert BREEAM assessments, pre-assessments, and sustainability consulting to help you achieve environmental certification and enhance your building''s green credentials.
      </p>
      <div class="pt-4">
        <a href="#contact" class="inline-block bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-orange-500/25 hover:translate-y-[-2px] active:translate-y-0">
          Get in Touch
        </a>
      </div>
    </div>
  </section>

  <!-- Sectors We Serve -->
  <section class="max-w-6xl mx-auto px-6">
    <div class="text-center space-y-3 mb-12">
      <h2 class="text-3xl font-extrabold font-display text-slate-900">Sectors We Serve</h2>
      <p class="text-sm text-slate-500 max-w-xl mx-auto">
        We provide tailored sustainability solutions across commercial, residential, and industrial construction projects.
      </p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">C</div>
        <h3 class="font-bold text-lg text-slate-900">Commercial</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          We specialize in commercial projects, providing solutions that cater to businesses of all sizes to create functional, compliant commercial spaces.
        </p>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">R</div>
        <h3 class="font-bold text-lg text-slate-900">Residential</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Our residential services focus on building and renovating homes that combine comfort, style, functionality, and high BREEAM ratings.
        </p>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">I</div>
        <h3 class="font-bold text-lg text-slate-900">Industrial</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          We provide industrial construction services designed to meet the specific needs of manufacturing, operations, and water use reduction.
        </p>
      </div>
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
        <div class="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">M</div>
        <h3 class="font-bold text-lg text-slate-900">Management</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Our project management services ensure your sustainability and construction goals are completed on time and within budget.
        </p>
      </div>
    </div>
  </section>

  <!-- Core BREEAM Services -->
  <section class="bg-slate-50 py-16 px-6 border-t border-b border-slate-100">
    <div class="max-w-6xl mx-auto">
      <div class="text-center space-y-3 mb-12">
        <h2 class="text-3xl font-extrabold font-display text-slate-900">Our BREEAM Services</h2>
        <p class="text-sm text-slate-500 max-w-xl mx-auto">
          Comprehensive sustainability assessments and consultancy services for all stages of your building''s lifecycle.
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">BREEAM Consultant</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Guiding projects through sustainability standards, improving compliance, design efficiency, certification success, and environmental performance.
            </p>
          </div>
          <a href="/breeam-consultant" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">Pre-Assessment</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Evaluating building design early to provide a clear roadmap, improve sustainability, ensure compliance, and reduce long-term costs.
            </p>
          </div>
          <a href="/breeam-pre-assessment" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">New Construction Assessor</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Ensuring compliance, maximizing credits, reducing environmental impact, and achieving successful certification for new developments.
            </p>
          </div>
          <a href="/breeam-new-construction-assessor" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">BREEAM In-Use</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Evaluating existing operational buildings to improve sustainability, energy efficiency, occupant well-being, and long-term asset value.
            </p>
          </div>
          <a href="/breeam-in-use-assessments" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">Assessor London</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              London-based assessors providing local expertise to guide construction projects through successful certification and compliance.
            </p>
          </div>
          <a href="/breeam-assessor-london" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
        <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div class="space-y-3">
            <h3 class="font-bold text-lg text-slate-900">Lifecycle Assessment (LCA)</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Evaluating environmental impacts across a building''s entire lifecycle to enable sustainable decisions, compliance, and carbon reduction.
            </p>
          </div>
          <a href="/lifecycle-assessment-lca-services" class="inline-block font-bold text-xs text-orange-600 hover:underline pt-2">Learn More &rarr;</a>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQs Section -->
  <section class="max-w-4xl mx-auto px-6">
    <div class="text-center space-y-3 mb-12">
      <h2 class="text-3xl font-extrabold font-display text-slate-900">Frequently Asked Questions</h2>
      <p class="text-sm text-slate-500 max-w-xl mx-auto">
        Find answers to common questions about BREEAM assessments and building certifications in the UK.
      </p>
    </div>
    <div class="space-y-4">
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">What is a BREEAM assessment?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          A BREEAM assessment is a sustainability evaluation for buildings, measuring environmental performance across energy efficiency, water usage, waste management, and indoor environmental quality. It helps building owners reduce operating costs and enhance sustainability.
        </p>
      </details>
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">How does BREEAM work?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          BREEAM evaluates buildings at each stage of their lifecycle—from design to operation. Points are awarded across multiple sustainability categories, and the total score determines the certification level, ranging from Pass to Outstanding. This ensures compliance with recognized environmental standards.
        </p>
      </details>
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">Is BREEAM used in the UK?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          Yes, BREEAM is widely adopted across the UK and is the leading sustainability assessment method for buildings. Many commercial and residential developers use BREEAM to meet regulatory requirements and achieve energy efficiency and net zero goals.
        </p>
      </details>
      <details class="group border border-slate-200 rounded-xl bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
        <summary class="flex items-center justify-between cursor-pointer focus:outline-none">
          <h3 class="font-bold text-sm text-slate-900">How much does a BREEAM assessment cost?</h3>
          <span class="ml-1.5 flex-shrink-0 rounded-full bg-slate-50 p-1.5 text-slate-900 group-open:rotate-180 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </span>
        </summary>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">
          Costs vary depending on building size, type, complexity, and desired certification level. At BREEAM Assessment UK, we provide customised quotes to ensure accurate pricing and value for your project.
        </p>
      </details>
    </div>
  </section>
</div>';
BEGIN
    -- Get the site_id from site_settings (typically one row in child databases)
    SELECT id::text INTO v_site_id FROM public.site_settings LIMIT 1;
    
    -- Only run this seed on BREEAM sites (checks the URL or site name)
    IF v_site_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.site_settings 
        WHERE site_url LIKE '%breeamassessment%' 
           OR site_name LIKE '%Breeam%' 
           OR site_name LIKE '%BREEAM%'
    ) THEN
        -- Insert or update the homepage (slug: '')
        INSERT INTO public.imported_posts (
            site_id, 
            title, 
            slug, 
            type, 
            body, 
            render_mode, 
            status, 
            source,
            publish_date
        )
        VALUES (
            v_site_id,
            'BREEAM Assessment Services | Sustainable Certification UK',
            '',
            'page',
            v_html_body,
            'html',
            'published',
            'seed',
            now()
        )
        ON CONFLICT (site_id, slug) 
        DO UPDATE SET 
            body = EXCLUDED.body, 
            title = EXCLUDED.title,
            render_mode = EXCLUDED.render_mode,
            status = EXCLUDED.status,
            updated_at = now();
    END IF;
END $$;
