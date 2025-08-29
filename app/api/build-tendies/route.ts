import { NextRequest } from "next/server";
import JSZip from "jszip";
import { readFile } from "fs/promises";
import path from "path";
import bplistParser from "bplist-parser";
import bplistCreator from "bplist-creator";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const caArrayBuffer = await req.arrayBuffer();
    const caBuffer = Buffer.from(caArrayBuffer);

    const { searchParams } = new URL(req.url);
    const requestedFilename = searchParams.get("filename");
    const caFilename = (requestedFilename && requestedFilename.trim()) || "project.ca";

    const templateZipPath = path.join(process.cwd(), "lib", "templates", "tendies.zip");
    const templateZipData = await readFile(templateZipPath);

    const zip = await JSZip.loadAsync(templateZipData);

    const internalDir = //do i shorten this to wallpaper.wallpaper? ig it dont matter
      "descriptors/09E9B685-7456-4856-9C10-47DF26B76C33/versions/0/contents/7400.WWDC_2022-390w-844h@3x~iphone.wallpaper/";
    zip.file(internalDir + caFilename, caBuffer);

    const plistPath = internalDir + "Wallpaper.plist";
    const plistFile = zip.file(plistPath);
    if (plistFile) {
      try {
        const rawBuffer = await plistFile.async("nodebuffer");
        let updatedBuffer: Buffer | null = null;
        try {
          const parsed = bplistParser.parseBuffer(rawBuffer)[0] as any;
          if (parsed && parsed.assets?.lockAndHome?.default) {
            parsed.assets.lockAndHome.default.foregroundAnimationFileName = caFilename;
            const created: any = bplistCreator(parsed);
            updatedBuffer = Buffer.isBuffer(created) ? created : Buffer.from(created as ArrayBuffer);
          }
        } catch {} //fallback
        if (!updatedBuffer) {
          const plistText = rawBuffer.toString("utf8");
          const replaced = plistText.replace(
            /(\<key\>foregroundAnimationFileName\<\/key\>\s*\<string\>)([^<]*)(\<\/string\>)/,
            `$1${caFilename}$3`
          );
          updatedBuffer = Buffer.from(replaced, "utf8");
        }
        if (updatedBuffer) {
          zip.file(plistPath, updatedBuffer);
        }
      } catch {}
    }

    const output = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return new Response(output, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="tendies.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to build zip" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


