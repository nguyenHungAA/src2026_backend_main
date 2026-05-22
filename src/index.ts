import express, { Request, Response } from 'express'
import cors from 'cors'
import publicationRouter from './routes/publicationRoute.js'
import mentorRouter from './routes/mentorRoute.js'
import newsRouter from './routes/newsRoute.js'
import connectDB from './config/db.js'
import swaggerDocument from './swagger.js'

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
});

app.get('/swagger', (_req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SRC2026 Backend Swagger</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
            <style>
                body { margin: 0; background: #f8fafc; }
                .swagger-ui .topbar { display: none; }
            </style>
        </head>
        <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
                window.onload = function () {
                    window.ui = SwaggerUIBundle({
                        url: '/openapi.json',
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        persistAuthorization: true,
                    });
                };
            </script>
        </body>
        </html>
    `);
});

app.get('/', (req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SRC2026 Backend</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                .container { max-width: 640px; width: 100%; padding: 2.5rem; }
                h1 { font-size: 1.75rem; margin-bottom: 0.5rem; color: #fff; }
                .subtitle { color: #94a3b8; margin-bottom: 2rem; }
                .api-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
                .api-item { background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1.25rem; }
                .method { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 0.375rem; margin-right: 0.5rem; }
                .get { background: #065f46; color: #6ee7b7; }
                .post { background: #7c2d12; color: #fdba74; }
                .path { font-family: monospace; color: #fff; font-size: 0.95rem; }
                .desc { color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 SRC2026 Backend</h1>
                <p class="subtitle">Welcome! Here are the available API endpoints:</p>
                <p class="subtitle"><a href="/swagger" style="color:#93c5fd;">Open Swagger UI</a> to try requests in your browser.</p>
                <ul class="api-list">
                    <li class="api-item">
                        <span class="method get">GET</span>
                        <span class="path">/publication</span>
                        <p class="desc">Retrieve all publications, sorted by newest first.</p>
                    </li>
                    <li class="api-item">
                        <span class="method post">POST</span>
                        <span class="path">/publication/submit</span>
                        <p class="desc">Submit a new publication. Saves the publication to the database and sends a notification email to the admin. Content can include HTML with embedded image URLs.</p>
                    </li>
                    <li class="api-item">
                        <span class="method post">POST</span>
                        <span class="path">/publication/upload-image</span>
                        <p class="desc">Upload an image for a publication. Accepts multipart form data with field name "image" (max 5MB). Returns a Cloudinary URL to embed in publication content.</p>
                    </li>
                    <li class="api-item">
                        <span class="method get">GET</span>
                        <span class="path">/mentor</span>
                        <p class="desc">Retrieve the list of all mentors from the mentors database.</p>
                    </li>
                    <li class="api-item">
                        <span class="method post">POST</span>
                        <span class="path">/mentor/submit</span>
                        <p class="desc">Submit or update a pending mentor profile.</p>
                    </li>
                    <li class="api-item">
                        <span class="method post">POST</span>
                        <span class="path">/mentor/upload-avatar</span>
                        <p class="desc">Upload a mentor avatar image. Accepts multipart form data with field name "avatar" (max 5MB).</p>
                    </li>
                    <li class="api-item">
                        <span class="method get">GET</span>
                        <span class="path">/news</span>
                        <p class="desc">Retrieve all news articles, sorted by newest first.</p>
                    </li>
                </ul>
            </div>
        </body>
        </html>
    `);
});

app.use('/publication', publicationRouter);
app.use('/mentor', mentorRouter);
app.use('/news', newsRouter);

const startServer = async () => {
    app.listen(PORT, () => {
        console.log('\n');
        console.log('Welcome to SRC2026 backend!');
        console.log(`Server is running at http://localhost:${PORT}`);
        console.log('\n');
    });

    await connectDB();
};

startServer();
