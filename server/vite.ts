import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production builds, we know exactly where the static files are
  // They're in dist/public relative to the current working directory
  const distPath = path.join(process.cwd(), 'dist', 'public');
  
  console.log(`Attempting to serve static files from: ${distPath}`);
  
  // Check if the directory exists
  if (!fs.existsSync(distPath)) {
    console.error(`Static files directory not found: ${distPath}`);
    console.error('This could be due to a build issue or incorrect working directory.');
    console.error('Current working directory:', process.cwd());
    throw new Error(`Static files directory not found: ${distPath}. Make sure to build the client first.`);
  }
  
  // Serve static files
  app.use(express.static(distPath));
  console.log(`✅ Serving static files from: ${distPath}`);
  
  // Check if index.html exists
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`Index file not found: ${indexPath}`);
    throw new Error(`Index file not found: ${indexPath}. Make sure the build completed successfully.`);
  }
  
  console.log(`✅ Found index.html at: ${indexPath}`);
  
  // Fall through to index.html for SPA routing
  app.use('*', (_req, res) => {
    res.sendFile(indexPath);
  });
}
