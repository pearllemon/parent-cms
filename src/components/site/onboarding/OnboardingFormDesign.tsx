import { ClipboardList, QrCode, Phone, Mail, CheckCircle2 } from "lucide-react";
import { PaperformEmbed } from "@/components/site/PaperformEmbed";
import { Button } from "@/components/ui/button";

interface OnboardingFormDesignProps {
  page: any;
  paperformId?: string;
  barcodeImageUrl?: string | null;
  barcodeLabel?: string | null;
  branding?: any;
}

/**
 * Dedicated design layout for Onboarding & Client Lead Generation Form pages.
 * Integrates interactive Paperform embed and designated Barcode / QR Code container.
 */
export function OnboardingFormDesign({
  page,
  paperformId = "omnichannel-leadgenform",
  barcodeImageUrl = null,
  barcodeLabel = "Scan or view barcode for this onboarding flow",
  branding = { primary: "#F4B80E", accent: "#111111" }
}: OnboardingFormDesignProps) {
  const effectiveFormId =
    paperformId ||
    (page?.slug?.includes("omnichannel") ? "omnichannel-leadgenform" : page?.slug || "omnichannel-leadgenform");

  return (
    <main id="main-content" className="bg-background min-h-screen">
      {/* HERO SECTION */}
      <section className="bg-slate-50 border-b py-12 text-center lg:py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em]"
            style={{ backgroundColor: `${branding.primary}33`, color: "#111" }}
          >
            <ClipboardList className="size-3.5" aria-hidden="true" />
            Client Onboarding & Intake
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
            {page?.title || "Omni Channel Client Lead Generation Form"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {page?.excerpt ||
              "Please complete the intake form below to get started with Pearl Lemon Group."}
          </p>
        </div>
      </section>

      {/* FORM & BARCODE CONTENT AREA */}
      <section className="py-12 lg:py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* BARCODE / QR CODE DISPLAY SLOT */}
          {barcodeImageUrl && (
            <div className="overflow-hidden rounded-2xl border-2 border-yellow-500/60 bg-amber-50/40 p-6 shadow-sm sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="flex size-28 shrink-0 items-center justify-center rounded-xl border bg-white p-2 shadow-sm">
                  <img
                    src={barcodeImageUrl}
                    alt={barcodeLabel || "Barcode"}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                    <QrCode className="size-5 text-amber-500" aria-hidden="true" />
                    Client Barcode / QR Code
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {barcodeLabel || "Scan this code or keep your reference ID handy during onboarding."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PAPERFORM EMBED CONTAINER */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Secure Intake Portal
              </div>
            </div>
            <PaperformEmbed formId={effectiveFormId} />
          </div>

          {/* DIRECT CONTACT FALLBACK */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-900">
              Need immediate help with your submission?
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-sm">
              <a
                href="tel:+442071833436"
                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:underline"
              >
                <Phone className="size-4" />
                +44 207 183 3436
              </a>
              <a
                href="mailto:info@pearlemongroup.com"
                className="inline-flex items-center gap-1.5 font-semibold text-slate-800 hover:underline"
              >
                <Mail className="size-4" />
                info@pearlemongroup.com
              </a>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}

export default OnboardingFormDesign;
