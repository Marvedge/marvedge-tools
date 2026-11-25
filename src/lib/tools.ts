export const MARVEDGE_URL = "https://marvedge.com/";

export type Tool = {
  slug: string;
  path: string;
  name: string;
  category: "Free utility" | "AI tool";
  tagline: string;
  headline: [string, string];
  sub: string;
  story: [string, string, string];
  features: string[];
  audience: string;
  related: string[];
};

const t = (x: Omit<Tool, "path">): Tool => ({ ...x, path: `/${x.slug}` });

export const tools: Tool[] = [
  t({ slug: "mp4-to-gif", name: "MP4 to GIF", category: "Free utility", tagline: "Convert video clips into looping GIFs.",
    headline: ["Trim clips into", "clean looping GIFs."], sub: "Set trim points, width, and frame rate, then save a GIF ready for docs and tickets.",
    story: ["Small clips explain bugs and features better than text.", "Select the exact timestamp, adjust size, and preview the loop in memory.", "Export a lightweight GIF that plays everywhere."],
    features: ["Trim start and end", "Width and FPS controls", "Live preview", "Quality slider"], audience: "Creators, marketers, support teams", related: ["gif-compressor", "video-compressor"] }),
  t({ slug: "image-compressor", name: "Image Compressor", category: "Free utility", tagline: "Compress JPG, PNG, and WebP images.",
    headline: ["Shrink image weight", "without losing sharpness."], sub: "Compress images in batches with side-by-side preview. Files never leave your browser.",
    story: ["Oversized images slow down page loads and email delivery.", "Adjust the quality slider to lower file size while keeping text and edges sharp.", "Download smaller files in seconds."],
    features: ["JPG, PNG, WebP", "Batch processing", "Before and after preview", "Saved size report"], audience: "Site owners, designers, developers", related: ["image-format-converter", "image-resizer"] }),
  t({ slug: "qr-code-generator", name: "QR Code Generator & Printer", category: "Free utility", tagline: "Generate and print custom QR sheets.",
    headline: ["Create custom QR codes", "and print ready sheets."], sub: "Generate QR codes for links, text, or Wi-Fi. Export PNG or SVG, or format multi-up print sheets for A4 and Letter.",
    story: ["Share links and networks on printed signs, menus, and packages.", "Choose custom colors, add center labels, and set exact millimetre print sizing.", "Export vector SVG or single-page print sheets."],
    features: ["URL, text, and Wi-Fi", "Custom colors and frames", "PNG and SVG export", "Print layouts: A4 and Letter"], audience: "Small businesses, organizers, restaurants", related: ["favicon-generator", "link-shortener"] }),
  t({ slug: "video-compressor", name: "Video Compressor", category: "Free utility", tagline: "Reduce MP4 video file sizes in memory.",
    headline: ["Compress video files", "to target size limits."], sub: "Lower bitrate and resolution with preset target limits for Slack, email, and web.",
    story: ["Chat apps and email servers reject screen recordings over 25 MB.", "Choose a target size or resolution and preview the compressed output.", "Files encode locally in memory without uploading to a third party."],
    features: ["MP4 video input", "Target size presets", "Bitrate and resolution", "Output preview"], audience: "Product teams, video creators", related: ["mp4-to-gif", "video-aspect-ratio"] }),
  t({ slug: "gif-compressor", name: "GIF Compressor", category: "Free utility", tagline: "Reduce GIF file size and drop frames.",
    headline: ["Compress animated GIFs", "by palette and frames."], sub: "Resize dimensions, reduce frame rates, and optimize palettes with direct size comparison.",
    story: ["Large animated GIFs cause stuttering and exceed platform upload caps.", "Trim redundant frames and reduce color depth to drop file size quickly.", "Keep the animation clear while cutting megabytes."],
    features: ["Frame rate reduction", "Color palette optimization", "Dimensions scaling", "Size comparison"], audience: "Community managers, technical writers", related: ["mp4-to-gif", "image-compressor"] }),
  t({ slug: "image-resizer", name: "Image Resizer & Cropper", category: "Free utility", tagline: "Crop and resize to exact pixel sizes.",
    headline: ["Resize and crop images", "with fixed aspect ratios."], sub: "Scale dimensions, lock ratios, apply portal upload presets, and target file size caps.",
    story: ["Platforms and document portals require specific aspect ratios and strict KB limits.", "Pick a standard preset or enter custom dimensions to fit requirements.", "Export correctly formatted images on the first attempt."],
    features: ["Aspect ratio lock", "Portal size presets", "Target file size limit", "Instant dimensions check"], audience: "Ecommerce sellers, job applicants, writers", related: ["image-compressor", "favicon-generator"] }),
  t({ slug: "image-format-converter", name: "Image Format Converter", category: "Free utility", tagline: "Convert between JPG, PNG, and WebP.",
    headline: ["Convert image formats", "in fast local batches."], sub: "Batch convert between JPG, PNG, and WebP while preserving transparency and metadata.",
    story: ["Modern sites need WebP, while older tools require PNG or JPG.", "Drop files into the converter, pick the target format, and maintain alpha transparency.", "Download converted files individually or as a single ZIP."],
    features: ["JPG, PNG, WebP", "Batch conversion", "Alpha transparency support", "ZIP archive export"], audience: "Designers, web developers, content creators", related: ["image-compressor", "image-resizer"] }),
  t({ slug: "pdf-merger", name: "PDF Merger & Splitter", category: "Free utility", tagline: "Merge, split, and reorder PDF pages.",
    headline: ["Combine or split PDFs", "privately in browser."], sub: "Merge multiple documents, drag pages into order, extract page ranges, and preview locally.",
    story: ["Scattered contracts and slide exports often need to be combined into one clear file.", "Rearrange pages visually and remove unwanted sheets in seconds.", "The entire document stays in local browser memory."],
    features: ["Merge multiple files", "Reorder pages", "Extract page ranges", "Client-side preview"], audience: "Operations teams, students, legal teams", related: ["image-format-converter", "screenshot-to-guide"] }),
  t({ slug: "favicon-generator", name: "Favicon Generator", category: "Free utility", tagline: "Generate complete multi-size favicon packs.",
    headline: ["Generate browser icons", "from any logo file."], sub: "Upload your brand mark, crop to square, and download standard 16x16, 32x32, and apple-touch icons.",
    story: ["New web projects need clean favicons across browser tabs, bookmarks, and mobile home screens.", "Upload a logo, center the crop, and check how it renders in a simulated tab.", "Download the complete icon bundle with HTML snippet."],
    features: ["Square crop tool", "Standard web sizes", "Browser tab preview", "ICO and PNG bundle"], audience: "Developers, founders, design agencies", related: ["qr-code-generator", "image-resizer"] }),
  t({ slug: "video-aspect-ratio", name: "Video Aspect Ratio Changer", category: "Free utility", tagline: "Reframe clips to 16:9, 9:16, or 1:1.",
    headline: ["Reframe video formats", "for landscape or feeds."], sub: "Convert horizontal screen recordings to 9:16 vertical or 1:1 square with background blur.",
    story: ["Desktop screen recordings recorded at 16:9 look small on mobile social feeds.", "Choose vertical 9:16 or square 1:1 with auto-blur padding to fill borders.", "Export format-ready video for TikTok, Shorts, and Reels."],
    features: ["16:9, 9:16, 1:1 presets", "Blur padding fill", "Custom color padding", "Fast client rendering"], audience: "Social media managers, video editors", related: ["video-compressor", "subtitle-generator"] }),
  t({ slug: "link-shortener", name: "Link Shortener", category: "Free utility", tagline: "Create short links with custom paths.",
    headline: ["Shorten long links", "with expiry dates."], sub: "Create clean short URLs with custom slugs, optional passwords, and automatic expiration.",
    story: ["Tracking links with lengthy query parameters are hard to read and share.", "Set an easy custom slug, set an expiration date, and copy the short link.", "Links route directly to the destination."],
    features: ["Custom slug options", "Expiry timestamps", "Password protection", "One-click copy"], audience: "Marketers, community managers, founders", related: ["qr-code-generator", "content-repurposer"] }),
  t({ slug: "video-summarizer", name: "AI Video and Media Summarizer", category: "AI tool", tagline: "Summarize recordings into key takeaways.",
    headline: ["Extract key points", "from transcripts and video."], sub: "Summarize meeting recordings and walkthroughs into concise takeaways and timestamped chapters.",
    story: ["Long product demos and recorded calls take too long to review start to finish.", "Paste a transcript or video source to get structured bullet points and topics.", "Skim decisions and action items in seconds."],
    features: ["Bullet takeaways", "Timestamped topics", "Transcript processor", "Clean copy output"], audience: "Product managers, engineers, students", related: ["content-repurposer", "subtitle-generator"] }),
  t({ slug: "subtitle-generator", name: "AI Subtitle & Caption Generator", category: "AI tool", tagline: "Generate and sync SRT and VTT subtitles.",
    headline: ["Transcribe speech", "into timed subtitles."], sub: "Transcribe audio from clips, edit timing line by line, and export standard SRT or VTT caption files.",
    story: ["Most viewers watch social video and product demos on mute.", "Generate accurate timestamps for spoken words and make quick corrections in the editor.", "Export captions ready for YouTube, LinkedIn, or video players."],
    features: ["Speech transcription", "Timestamp editor", "SRT and VTT export", "Timing alignment"], audience: "Video producers, content creators, educators", related: ["voiceover-generator", "video-aspect-ratio"] }),
  t({ slug: "youtube-title-generator", name: "AI YouTube Title & Description", category: "AI tool", tagline: "Generate video titles and descriptions.",
    headline: ["Draft search titles", "and chapter descriptions."], sub: "Generate video titles, hook lines, descriptions, and chapters from a topic or transcript.",
    story: ["Good video content needs clear, searchable titles to help viewers find it.", "Enter your topic or draft script to generate tested title formats and descriptions.", "Pick the best hook and publish faster."],
    features: ["Multiple title variants", "Search descriptions", "Hook lines", "Chapter outlines"], audience: "YouTubers, growth marketers", related: ["content-repurposer", "video-summarizer"] }),
  t({ slug: "content-repurposer", name: "AI Content Repurposer", category: "AI tool", tagline: "Turn long content into social formats.",
    headline: ["Repurpose one draft", "across multiple channels."], sub: "Transform articles, meeting notes, or transcripts into LinkedIn posts, brief updates, and newsletter snippets.",
    story: ["Writing separate drafts for every channel takes hours each week.", "Paste an existing post or transcript to draft channel-specific variants in one step.", "Keep your message consistent across platforms."],
    features: ["LinkedIn posts", "Short updates", "Newsletter blurbs", "Tone adjustments"], audience: "Founders, content marketers, creators", related: ["youtube-title-generator", "product-description-generator"] }),
  t({ slug: "product-description-generator", name: "AI Product Description", category: "AI tool", tagline: "Draft benefit-led product copy.",
    headline: ["Draft product copy", "from feature bullet points."], sub: "Generate clear product descriptions, benefit summaries, and specifications from technical notes.",
    story: ["Listing raw specs misses why customers buy the product.", "Enter your feature notes to generate clear, customer-focused copy.", "Choose between concise, technical, or conversational tones."],
    features: ["Benefit summaries", "Feature lists", "Tone presets", "Multi-version outputs"], audience: "Store owners, product marketers", related: ["content-repurposer", "demo-script-generator"] }),
  t({ slug: "screenshot-to-guide", name: "AI Screenshot-to-Guide", category: "AI tool", tagline: "Convert screenshots into step-by-step guides.",
    headline: ["Turn UI screenshots", "into structured guides."], sub: "Sequence screen captures with notes to generate numbered tutorials and standard operating procedures.",
    story: ["Documenting multi-step software workflows with manual text takes repetitive effort.", "Upload screenshots in sequence with short notes to produce clean instructional steps.", "Export organized markdown guides ready for internal wikis."],
    features: ["Numbered step sequence", "Instructional copy", "Documentation export", "Markdown format"], audience: "Technical writers, support teams, operations", related: ["demo-script-generator", "pdf-merger"] }),
  t({ slug: "voiceover-generator", name: "AI Voiceover Generator", category: "AI tool", tagline: "Generate voiceovers in natural voices.",
    headline: ["Turn written scripts", "into spoken narration."], sub: "Generate natural narration from text scripts with voice selection and preview controls.",
    story: ["Recording voiceovers requires microphones, quiet rooms, and multiple takes.", "Paste your demo script, select a voice style, and listen to the audio preview.", "Download WAV or MP3 audio ready to sync with your video."],
    features: ["Natural speech synthesis", "Multiple voice profiles", "Audio preview", "Audio download"], audience: "Tutorial creators, marketing teams", related: ["subtitle-generator", "demo-script-generator"] }),
  t({ slug: "demo-script-generator", name: "AI Product Demo Script", category: "AI tool", tagline: "Draft structured 3-act product demo scripts.",
    headline: ["Structure demo scripts", "with clear problem beats."], sub: "Convert product features into a 3-act demo script with hook, feature walkthrough, and closing call to action.",
    story: ["Product walkthroughs without a clear script often lose the viewer's attention.", "Input the core product problem and features to get a timed scene breakdown.", "Keep your video concise and focused on customer value."],
    features: ["3-act script outline", "Scene by scene breakdown", "Spoken narration draft", "Call to action prompt"], audience: "SaaS founders, sales engineers, marketers", related: ["screenshot-to-guide", "voiceover-generator"] }),
];

export const getTool = (slug: string): Tool => {
  const tool = tools.find((x) => x.slug === slug);
  if (!tool) throw new Error(`Unknown tool ${slug}`);
  return tool;
};
