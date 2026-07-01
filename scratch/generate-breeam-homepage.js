import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genId = () => Math.random().toString(36).slice(2, 9);

// Create the Elementor JSON tree
const elementorData = [
  // 1. Hero Section (Dark)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#0b0c10",
      color: "#ffffff",
      padding: { top: 90, bottom: 90, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 60 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "UK SUSTAINABLE CERTIFICATION",
              header_size: "span",
              title_color: "#FA8739",
              typography_font_size: { size: 12, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "800",
              typography_text_transform: "uppercase",
              typography_letter_spacing: { size: 1.5, unit: "px" }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "Lower Your Building's Maintenance Costs with BREEAM Assessment UK",
              header_size: "h1",
              title_color: "#ffffff",
              typography_font_size: { size: 46, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "800",
              typography_line_height: { size: 1.15, unit: "em" }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 16px; color: #c5c6c7; line-height: 1.65; margin-top: 15px; margin-bottom: 25px; font-family: 'Bai Jamjuree'">Want to reduce the cost of maintaining your building while boosting efficiency? A BREEAM assessment helps you identify areas to save on energy, maintenance, and long-term operating expenses. Book a call today to start cutting costs!</p>`
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: {
              text: "BOOK A CALL",
              link: { url: "https://breeamassessment.co.uk/book-a-call/" },
              button_background_color: "#FA8739",
              button_text_color: "#ffffff"
            }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 40 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "image",
            settings: {
              image: {
                url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/What-is-breeam-green-building-rating-system-1024x640-1.jpeg",
                alt: "BREEAM Green Building Rating System"
              },
              border_radius: { size: 16, unit: "px" }
            }
          }
        ]
      }
    ]
  },

  // 2. Trust Banner (Dark Accent)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#12141c",
      padding: { top: 20, bottom: 20, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "html",
            settings: {
              html: `<div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 20px; align-items: center; color: #c5c6c7; font-family: 'Bai Jamjuree', sans-serif; font-size: 13px; font-weight: 700;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: #ffc123; font-size: 16px;">★ ★ ★ ★ ★</span>
                  <span>Trustpilot 4.9/5 Rating</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: #FA8739;">✔</span>
                  <span>Licensed BREEAM Assessors</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: #FA8739;">✔</span>
                  <span>UK-Wide Compliance Services</span>
                </div>
              </div>`
            }
          }
        ]
      }
    ]
  },

  // 3. Our Company Section (Light)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#ffffff",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 45 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "image",
            settings: {
              image: {
                url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/business-man-financial-inspector-secretary-making-report-calculating-checking-balance-internal-revenue-service-inspector-checking-document-audit-concept_1423-126-1.jpg",
                alt: "Our Company Audit"
              },
              border_radius: { size: 16, unit: "px" }
            }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 55 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "OUR COMPANY",
              header_size: "span",
              title_color: "#FA8739",
              typography_font_size: { size: 12, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "800",
              typography_text_transform: "uppercase"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "Promoting Sustainable Building Practices",
              header_size: "h2",
              title_color: "#120E0B",
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 15px; color: #54585F; line-height: 1.6; margin-top: 10px; margin-bottom: 20px; font-family: 'Bai Jamjuree'">At BREEAM Assessment UK, we are committed to promoting sustainable building practices and helping our clients achieve their environmental goals. With years of experience in the industry, our team of experts is dedicated to providing top-notch BREEAM assessment services that meet the highest standards of environmental performance.</p>`
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "accordion",
            settings: {
              items: [
                {
                  title: "Our Mission",
                  content: "Our mission is to make sustainable building practices accessible to all, helping to create a greener, more environmentally friendly future. We strive to provide our clients with tailored solutions that not only meet their needs but also exceed their expectations."
                },
                {
                  title: "Our Approach",
                  content: "We take a collaborative approach to our work, working closely with our clients to understand their needs and develop solutions that are both effective and sustainable. We believe in building long-term relationships with our clients, based on trust, transparency, and mutual respect."
                }
              ]
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: {
              text: "Learn About BREEAM Assessment",
              link: { url: "https://breeamassessment.co.uk/book-a-call/" },
              button_background_color: "#FA8739",
              button_text_color: "#ffffff"
            }
          }
        ]
      }
    ]
  },

  // 4. Services Section (Light Gray)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#f8f9fa",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "Sustainable Solutions, Exceptional Results",
              header_size: "h2",
              title_color: "#120E0B",
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700",
              align: "center"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 15px; color: #54585F; text-align: center; max-width: 750px; margin: 10px auto 40px; font-family: 'Bai Jamjuree'">At BREEAM Assessment UK, we are dedicated to providing top-notch BREEAM (Building Research Establishment Environmental Assessment Method) assessment services to help you achieve sustainable and environmentally friendly buildings. As a leading provider in the UK, we offer a range of services tailored to meet your specific project needs.</p>`
            }
          }
        ]
      },
      // Service 1
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#ffffff",
          padding: { top: 30, right: 25, bottom: 30, left: 25, unit: "px" },
          border_radius: { size: 16, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "image",
            settings: {
              image: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/logo-9.png" },
              height: { size: 50, unit: "px" },
              align: "left",
              margin: { bottom: 15 }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "01 BREEAM Assessment",
              header_size: "h3",
              title_color: "#120E0B",
              typography_font_size: { size: 20, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 14px; color: #54585F; line-height: 1.5; margin-top: 10px; font-family: 'Bai Jamjuree'">Our BREEAM assessment services cover all stages of the BREEAM certification process, from pre-assessment to post-construction, ensuring that your project meets the highest standards of environmental performance.</p>`
            }
          }
        ]
      },
      // Service 2
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#ffffff",
          padding: { top: 30, right: 25, bottom: 30, left: 25, unit: "px" },
          border_radius: { size: 16, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "image",
            settings: {
              image: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/Afternoon-Tea-25-150x100.png" },
              height: { size: 50, unit: "px" },
              align: "left",
              margin: { bottom: 15 }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "02 Consultancy",
              header_size: "h3",
              title_color: "#120E0B",
              typography_font_size: { size: 20, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 14px; color: #54585F; line-height: 1.5; margin-top: 10px; font-family: 'Bai Jamjuree'">We provide expert consultancy services to help you develop sustainable design strategies and implement cost-effective solutions for your project's certification.</p>`
            }
          }
        ]
      },
      // Service 3
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#ffffff",
          padding: { top: 30, right: 25, bottom: 30, left: 25, unit: "px" },
          border_radius: { size: 16, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "image",
            settings: {
              image: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/environment-manufacturing-facility-due-dilligence.jpg" },
              height: { size: 50, unit: "px" },
              align: "left",
              margin: { bottom: 15 }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "03 Environmental Due Diligence",
              header_size: "h3",
              title_color: "#120E0B",
              typography_font_size: { size: 20, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 14px; color: #54585F; line-height: 1.5; margin-top: 10px; font-family: 'Bai Jamjuree'">Our environmental due diligence services help you understand and mitigate the environmental risks associated with your project, ensuring seamless compliance.</p>`
            }
          }
        ]
      }
    ]
  },

  // 5. Why Choose Us Section (White)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#ffffff",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "Why Choose Us for Your BREEAM Assessment Needs?",
              header_size: "h2",
              title_color: "#120E0B",
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700",
              align: "center",
              margin: { bottom: 40 }
            }
          }
        ]
      },
      // 4 cards in 2x2 grid
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 50 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Expertise",
              description_text: "Our team of experienced professionals is well-versed in the BREEAM assessment process and can guide you through each step to ensure compliance and success.",
              icon: { value: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/Afternoon-Tea-25-150x100.png" } }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Commitment to Sustainability",
              description_text: "We are committed to promoting sustainable development and environmentally friendly practices, and our services reflect this commitment.",
              icon: { value: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/Afternoon-Tea-25-150x100.png" } }
            }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 50 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Tailored Solutions",
              description_text: "We understand that each project is unique, which is why we offer tailored solutions to meet your specific requirements and goals.",
              icon: { value: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/Afternoon-Tea-25-150x100.png" } }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Cost-Effective Solutions",
              description_text: "We offer cost-effective solutions that help you achieve your sustainability goals without breaking the bank.",
              icon: { value: { url: "https://breeamassessment.co.uk/wp-content/uploads/2024/05/Afternoon-Tea-25-150x100.png" } }
            }
          }
        ]
      }
    ]
  },

  // 6. How BREEAM Works (Process)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#f8f9fa",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "How BREEAM Works",
              header_size: "h2",
              title_color: "#120E0B",
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700",
              align: "center",
              margin: { bottom: 40 }
            }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 33 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Design Stage Assessment",
              description_text: "This involves analyzing the project design and associated systems to ensure compliance with BREEAM standards."
            }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 33 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Post Construction Assessment",
              description_text: "This includes a review of the construction, commissioning, and handover process to verify compliance with BREEAM criteria."
            }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 33 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "icon-box",
            settings: {
              title_text: "Operation and Maintenance",
              description_text: "This involves evaluating the operational and maintenance performance of the building and its systems to ensure ongoing compliance."
            }
          }
        ]
      }
    ]
  },

  // 7. Comprehensive Services Grid (White)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#ffffff",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "Comprehensive BREEAM & Construction Services",
              header_size: "h2",
              title_color: "#120E0B",
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700",
              align: "center"
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: {
              editor: `<p style="font-size: 15px; color: #54585F; text-align: center; max-width: 750px; margin: 10px auto 40px; font-family: 'Bai Jamjuree'">With years of experience in the industry, we offer comprehensive construction services that encompass everything from initial design concepts to final finishing touches.</p>`
            }
          }
        ]
      },
      // Row 1: 3 columns
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#f8f9fa",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 12, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: { title: "BREEAM Consultant", header_size: "h3", typography_font_size: { size: 18 }, typography_font_family: "Bai Jamjuree", typography_font_weight: "700" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p style=\"font-size: 13px; color: #54585F; font-family: 'Bai Jamjuree'\">BREEAM consultants guide projects through sustainability standards, improving compliance, design efficiency, certification success, asset value, and environmental outcomes.</p>" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: { text: "READ MORE", link: { url: "/breeam-consultant/" }, button_background_color: "#FA8739" }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#f8f9fa",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 12, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: { title: "Pre-Assessment", header_size: "h3", typography_font_size: { size: 18 }, typography_font_family: "Bai Jamjuree", typography_font_weight: "700" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p style=\"font-size: 13px; color: #54585F; font-family: 'Bai Jamjuree'\">BREEAM Pre-Assessment evaluates building design early, providing a roadmap, improving sustainability performance, ensuring compliance, and reducing costs.</p>" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: { text: "READ MORE", link: { url: "/breeam-pre-assessment/" }, button_background_color: "#FA8739" }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#f8f9fa",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 12, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: { title: "New Construction Assessor", header_size: "h3", typography_font_size: { size: 18 }, typography_font_family: "Bai Jamjuree", typography_font_weight: "700" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p style=\"font-size: 13px; color: #54585F; font-family: 'Bai Jamjuree'\">BREEAM new construction assessors guide projects through sustainability standards, ensuring compliance, maximizing credits, and achieving certification.</p>" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: { text: "READ MORE", link: { url: "/breeam-new-construction-assessor/" }, button_background_color: "#FA8739" }
          }
        ]
      },

      // Row 2: 3 columns
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#f8f9fa",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 12, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: { title: "BREEAM In-Use", header_size: "h3", typography_font_size: { size: 18 }, typography_font_family: "Bai Jamjuree", typography_font_weight: "700" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p style=\"font-size: 13px; color: #54585F; font-family: 'Bai Jamjuree'\">BREEAM In-Use Assessments evaluate existing operational buildings, improving sustainability, energy efficiency, and long-term environmental performance.</p>" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: { text: "READ MORE", link: { url: "/breeam-in-use-assessments/" }, button_background_color: "#FA8739" }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#f8f9fa",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 12, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: { title: "Assessor London", header_size: "h3", typography_font_size: { size: 18 }, typography_font_family: "Bai Jamjuree", typography_font_weight: "700" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p style=\"font-size: 13px; color: #54585F; font-family: 'Bai Jamjuree'\">London-based BREEAM assessors guide projects through certification, ensuring compliance, risk reduction, and higher property asset value.</p>" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: { text: "READ MORE", link: { url: "/breeam-assessor-london/" }, button_background_color: "#FA8739" }
          }
        ]
      },
      {
        id: genId(),
        elType: "column",
        settings: {
          _column_size: 33,
          background_color: "#f8f9fa",
          padding: { top: 25, right: 20, bottom: 25, left: 20, unit: "px" },
          border_radius: { size: 12, unit: "px" },
          margin: { top: 10, right: 10, bottom: 10, left: 10, unit: "px" }
        },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: { title: "Lifecycle Assessment (LCA)", header_size: "h3", typography_font_size: { size: 18 }, typography_font_family: "Bai Jamjuree", typography_font_weight: "700" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p style=\"font-size: 13px; color: #54585F; font-family: 'Bai Jamjuree'\">Lifecycle Assessment services evaluate environmental impacts across a building's lifecycle, enabling sustainable decisions and carbon reduction.</p>" }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "button",
            settings: { text: "READ MORE", link: { url: "/lifecycle-assessment-lca-services/" }, button_background_color: "#FA8739" }
          }
        ]
      }
    ]
  },

  // 8. FAQs Section (Light Gray)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#f8f9fa",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: "Frequently Asked Questions",
              header_size: "h2",
              title_color: "#120E0B",
              typography_font_size: { size: 32, unit: "px" },
              typography_font_family: "Bai Jamjuree",
              typography_font_weight: "700",
              align: "center",
              margin: { bottom: 40 }
            }
          },
          {
            id: genId(),
            elType: "widget",
            widgetType: "accordion",
            settings: {
              items: [
                {
                  title: "What is a BREEAM assessment?",
                  content: "A BREEAM assessment is a sustainability evaluation for buildings, measuring environmental performance across energy efficiency, water usage, waste management, and indoor environmental quality. It helps building owners reduce operating costs and enhance sustainability."
                },
                {
                  title: "How does BREEAM work?",
                  content: "BREEAM evaluates buildings at each stage of their lifecycle—from design to operation. Points are awarded across multiple sustainability categories, and the total score determines the certification level, ranging from Pass to Outstanding. This ensures compliance with recognized environmental standards."
                },
                {
                  title: "Is BREEAM used in the UK?",
                  content: "Yes, BREEAM is widely adopted across the UK and is the leading sustainability assessment method for buildings. Many commercial and residential developers use BREEAM to meet regulatory requirements and achieve energy efficiency and net zero goals."
                },
                {
                  title: "Both BREEAM and LEED are internationally recognized sustainability frameworks. What is the difference?",
                  content: "Both BREEAM and LEED are internationally recognized sustainability frameworks. BREEAM is more common in the UK and Europe, while LEED is widely used in the US. The best choice depends on your project location, regulatory requirements, and sustainability objectives."
                },
                {
                  title: "How much does a BREEAM assessment cost?",
                  content: "Costs vary depending on building size, type, complexity, and desired certification level. At BREEAM Assessment UK, we provide customised quotes to ensure accurate pricing and value for your project."
                },
                {
                  title: "What services do you provide?",
                  content: "We provide a full range of BREEAM services, including: BREEAM New Construction Assessments, BREEAM In-Use Assessments, BREEAM Pre-Assessments, Lifecycle Assessment (LCA), and BREEAM Consultancy for Net Zero Buildings."
                },
                {
                  title: "What are the benefits of BREEAM certification?",
                  content: "BREEAM certification showcases environmental responsibility, increases property value, and appeals to tenants or investors who prioritise sustainability. It also helps reduce energy and maintenance costs, improving long-term operational efficiency."
                },
                {
                  title: "How do I get started?",
                  content: "Book a call with our experts at BREEAM Assessment UK. We will review your building, explain the assessment process, and create a customised plan to achieve your sustainability goals."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // 9. News Section (White)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#ffffff",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "blog-section",
            settings: {
              title: "Latest News & Insights",
              subtitle: "Stay updated with our recent announcements, regulatory updates, and sustainability tips.",
              limit: 3
            }
          }
        ]
      }
    ]
  },

  // 10. Get in Touch Section (Light Gray)
  {
    id: genId(),
    elType: "section",
    settings: {
      background_color: "#f8f9fa",
      padding: { top: 80, bottom: 80, unit: "px" }
    },
    elements: [
      {
        id: genId(),
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: genId(),
            elType: "widget",
            widgetType: "contact-section",
            settings: {
              title: "Get in Touch",
              subtitle: "Reach out to us today for expert BREEAM assessment services tailored to your project's needs. Fill out the form below, and our team will get back to you shortly.",
              address: "2nd Floor, 123 Victoria St, London SW1E 6DE",
              phone: "+44 207 183 3436",
              email: "info@breeamassessment.co.uk",
              hours: "Monday to Friday (9-5)",
              formSlug: "contact"
            }
          }
        ]
      }
    ]
  }
];

// Generate SQL migration file content
const elementorDataStr = JSON.stringify(elementorData).replace(/'/g, "''");

const sqlContent = `-- Seed BREEAM site settings if empty
INSERT INTO public.site_settings (id, site_name, site_url)
VALUES ('default', 'Breeam Assessment UK', 'https://breeamassessment.co.uk')
ON CONFLICT (id) DO NOTHING;

-- Seed BREEAM homepage
DO $$
DECLARE
    v_site_id TEXT;
    v_json_data JSONB := '${elementorDataStr}'::jsonb;
    v_html_body TEXT := '<div class="space-y-20 pb-12">
  <!-- Seeded Elementor Homepage -->
  <p>This page is configured as an Elementor page. Please edit it visually in the CMS.</p>
</div>';
BEGIN
    SELECT id::text INTO v_site_id FROM public.site_settings LIMIT 1;
    
    IF v_site_id IS NULL THEN
        v_site_id := 'default';
    END IF;

    -- Insert or update the homepage (slug: '') in public.imported_posts
    INSERT INTO public.imported_posts (
        site_id, 
        title, 
        slug, 
        type, 
        body, 
        elementor_data,
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
        v_json_data,
        'elementor',
        'published',
        'seed',
        now()
    )
    ON CONFLICT (site_id, slug) 
    DO UPDATE SET 
        body = EXCLUDED.body, 
        title = EXCLUDED.title,
        elementor_data = EXCLUDED.elementor_data,
        render_mode = EXCLUDED.render_mode,
        status = EXCLUDED.status,
        updated_at = now();

    -- Insert or update the homepage (slug: '') in public.posts
    INSERT INTO public.posts (
        site_id, 
        title, 
        slug, 
        type, 
        body, 
        elementor_data,
        render_mode, 
        status, 
        template,
        publish_date,
        published_at
    )
    VALUES (
        v_site_id,
        'BREEAM Assessment Services | Sustainable Certification UK',
        '',
        'page',
        v_html_body,
        v_json_data,
        'elementor',
        'published',
        'home',
        now(),
        now()
    )
    ON CONFLICT (site_id, type, slug) WHERE site_id IS NOT NULL
    DO UPDATE SET 
        body = EXCLUDED.body, 
        title = EXCLUDED.title,
        elementor_data = EXCLUDED.elementor_data,
        render_mode = EXCLUDED.render_mode,
        status = EXCLUDED.status,
        template = EXCLUDED.template,
        updated_at = now();
END $$;
`;

const destPath = path.join(__dirname, '..', 'supabase', 'breeam_homepage_seed.sql');
fs.writeFileSync(destPath, sqlContent, 'utf8');
console.log('Successfully generated SQL migration at:', destPath);
