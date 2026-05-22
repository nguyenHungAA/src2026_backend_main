import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary.js';

const uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return;
        }

        // Upload buffer to Cloudinary
        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'src2026/publications',
                    resource_type: 'image',
                    transformation: [
                        { width: 800, height: 600, crop: 'fit' },  // fit within 800x600, keep entire image
                        { quality: 'auto', fetch_format: 'auto' },  // auto optimize
                    ],
                },
                (error, result) => {
                    if (error || !result) {
                        reject(error || new Error('Upload failed'));
                    } else {
                        resolve({ secure_url: result.secure_url, public_id: result.public_id });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });

        res.status(200).json({
            message: 'Image uploaded successfully',
            data: {
                url: result.secure_url,
                publicId: result.public_id,
            },
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Image upload failed' });
    }
};

export default uploadImage;
