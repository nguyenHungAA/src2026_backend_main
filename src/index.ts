import express, { Request, Response } from 'express'
import cors from 'cors'
import publicationRouter from './routes/publicationRoute.js'
import mentorRouter from './routes/mentorRoute.js'
import connectDB from './config/db.js'

const app = express();

app.use(cors());
app.use(express.json());

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
                <ul class="api-list">
                    <li class="api-item">
                        <span class="method get">GET</span>
                        <span class="path">/publications</span>
                        <p class="desc">Retrieve all publications, sorted by newest first.</p>
                    </li>
                    <li class="api-item">
                        <span class="method post">POST</span>
                        <span class="path">/publications/submit</span>
                        <p class="desc">Submit a new publication. Saves the publication to the database and sends a notification email to the admin. Content can include HTML with embedded image URLs.</p>
                    </li>
                    <li class="api-item">
                        <span class="method post">POST</span>
                        <span class="path">/publications/upload-image</span>
                        <p class="desc">Upload an image for a publication. Accepts multipart form data with field name "image" (max 5MB). Returns a Cloudinary URL to embed in publication content.</p>
                    </li>
                    <li class="api-item">
                        <span class="method get">GET</span>
                        <span class="path">/mentors</span>
                        <p class="desc">Retrieve the list of all mentors from the mentors database.</p>
                    </li>
                </ul>
            </div>
        </body>
        </html>
    `);
});

app.use('/publishcations', publicationRouter);
app.use('/mentors', mentorRouter);

const startServer = async () => {
    await connectDB();

    app.listen(3000, () => {
        console.log('\n');
        console.log('Welcome to SRC2026 backend!');
        console.log('\n');
    });
};

startServer();