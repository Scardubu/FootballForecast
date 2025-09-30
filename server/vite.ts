import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
// Do not import vite.config directly; let Vite load it to avoid TS/CJS conflicts
// Local uid generator to avoid external dependency
function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  try {
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const vite = await createViteServer({
      // Let Vite discover the config file (vite.config.ts) automatically
      configFile: undefined,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          // Don't exit on error, just log it
          log(`Vite error: ${msg}`, 'vite-error');
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");

        // Check if the index.html file exists
        if (!fs.existsSync(clientTemplate)) {
          log(`Index file not found: ${clientTemplate}`, 'vite-error');
          return res.status(500).send('Index template not found. Make sure the client directory is properly set up.');
        }

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${uid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        log(`Error serving HTML: ${(e as Error).message}`, 'vite-error');
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
    
    return vite;
  } catch (error) {
    log(`Failed to set up Vite: ${(error as Error).message}`, 'vite-error');
    throw error;
  }
}

export function serveStatic(app: Express) {
  try {
    // In production builds, we know exactly where the static files are
    // They're in dist/public relative to the current working directory
    const distPath = path.join(process.cwd(), 'dist', 'public');
    
    log(`Attempting to serve static files from: ${distPath}`, 'static');
    
    // Check if the directory exists
    if (!fs.existsSync(distPath)) {
      log(`Static files directory not found: ${distPath}`, 'static-error');
      log('This could be due to a build issue or incorrect working directory.', 'static-error');
      log(`Current working directory: ${process.cwd()}`, 'static-error');
      
      // Create a fallback directory with a simple HTML file
      const fallbackDir = path.join(process.cwd(), 'dist', 'fallback');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      
      const fallbackHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Football Forecast - Build Required</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
            .error { background: #fee; border: 1px solid #f99; padding: 1rem; border-radius: 4px; }
            code { background: #eee; padding: 0.2rem 0.4rem; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>Build Required</h1>
          <div class="error">
            <p><strong>Static files not found.</strong> The application needs to be built before it can be served.</p>
            <p>Run the following command to build the application:</p>
            <pre><code>npm run build</code></pre>
          </div>
          <p>For more information, see the <a href="/DEPLOYMENT.md">deployment documentation</a>.</p>
        </body>
        </html>
      `;
      
      fs.writeFileSync(path.join(fallbackDir, 'index.html'), fallbackHtml);
      app.use(express.static(fallbackDir));
      log(`Created and serving fallback page from: ${fallbackDir}`, 'static');
      
      // Fall through to fallback index.html
      app.use('*', (_req, res) => {
        res.sendFile(path.join(fallbackDir, 'index.html'));
      });
      
      return;
    }
    
    // Serve static files
    app.use(express.static(distPath));
    log(`✅ Serving static files from: ${distPath}`, 'static');
    
    // Check if index.html exists
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      log(`Index file not found: ${indexPath}`, 'static-error');
      throw new Error(`Index file not found: ${indexPath}. Make sure the build completed successfully.`);
    }
    
    log(`✅ Found index.html at: ${indexPath}`, 'static');
    
    // Fall through to index.html for SPA routing
    app.use('*', (_req, res) => {
      res.sendFile(indexPath);
    });
  } catch (error) {
    log(`Error setting up static file serving: ${(error as Error).message}`, 'static-error');
    throw error;
  }
}
