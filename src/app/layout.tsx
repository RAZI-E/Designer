import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://designer.lavaithan.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Designer by Lavaithan — AI Design to Prompt & Spec Converter",
    template: "%s | Designer by Lavaithan",
  },
  description:
    "Convert designs into prompts AI. Designer by Lavaithan instantly converts Figma designs, screenshots, and UI mockups into pixel-accurate IDE prompts for Cursor, Claude, Copilot, and v0.",
  keywords: [
    // Primary User-Specified Keywords
    "designer by lavaithan",
    "dasigner by lavaithan",
    "Lavaithan",
    "design to prompt",
    "convert design into prompt",
    "convert figma design into prompts",
    "convert design into prompts ai",
    "ai design to prompt",
    // High-Ranking Industry & Long-Tail SEO Keywords
    "figma to prompt",
    "figma to code prompt",
    "figma to cursor prompt",
    "image to code prompt",
    "ui screenshot to prompt",
    "screenshot to code ai",
    "design to ide prompt",
    "figma to tailwind prompt",
    "cursor rules generator",
    "figma to claude prompt",
    "convert design to code",
    "ai prompt engineer for developers",
    "pixel perfect ui prompts",
    "design blueprint generator",
    "ai spatial ui extraction",
  ],
  authors: [{ name: "Lavaithan", url: "https://github.com/RAZI-E" }],
  creator: "Lavaithan",
  publisher: "Lavaithan",
  applicationName: "Designer by Lavaithan",
  category: "Developer Tools",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Designer by Lavaithan — Convert Design into Prompts AI",
    description:
      "Convert Figma designs, images, and UI mockups into pixel-accurate, token-efficient IDE prompts for Cursor, Claude, and Copilot.",
    siteName: "Designer by Lavaithan",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Designer by Lavaithan Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Designer by Lavaithan — Design to Prompt AI Converter",
    description:
      "Turn Figma designs, images, and code repositories into mathematically grounded IDE prompts with zero hallucinations.",
    images: ["/logo.png"],
    creator: "@lavaithan",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Designer by Lavaithan",
    alternateName: ["Designer", "Lavaithan Designer", "AI Design to Prompt"],
    url: siteUrl,
    description:
      "Convert Figma designs, screenshots, and Git repositories into structured, pixel-accurate IDE prompts for AI code generation.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "All",
    author: {
      "@type": "Organization",
      name: "Lavaithan",
      url: "https://github.com/RAZI-E/Designer",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Convert Figma designs into structured IDE prompts",
      "AI design to prompt with Gemini 3.5 Flash vision",
      "Exact spatial coordinate and bounding box extraction",
      "Tailwind CSS code generation and token mapping",
      "Cursor rules (.cursorrules) and markdown blueprint export",
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Designer by Lavaithan?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Designer by Lavaithan is an open-source AI tool that converts Figma designs, UI mockups, and screenshots into mathematically grounded, token-efficient IDE prompts for Cursor, Claude Code, and Copilot.",
        },
      },
      {
        "@type": "Question",
        name: "How do I convert Figma design into prompts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Connect your Figma account or paste any design URL into Designer by Lavaithan. It extracts root container boundaries, AutoLayout parameters, exact coordinates, paddings, and typography to generate a ready-to-use IDE prompt blueprint.",
        },
      },
      {
        "@type": "Question",
        name: "Can I convert UI screenshots into prompts with AI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Designer uses Gemini 3.5 Flash multimodal vision to detect layout structures, design tokens, and components from screenshots, compiling them into a pixel-accurate prompt specification.",
        },
      },
      {
        "@type": "Question",
        name: "Is Designer by Lavaithan free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Designer by Lavaithan is 100% free and open-source under the MIT license.",
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('designer-theme') || 'dark';
                var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider defaultTheme="dark" storageKey="designer-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
