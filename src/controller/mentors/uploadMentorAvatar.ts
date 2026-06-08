import { Request, Response } from 'express';
import cloudinary from '../../config/cloudinary.js';

const uploadMentorAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No image file provided' });
            return;
        }

        // Upload buffer to Cloudinary
        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'src2026/mentors',
                    resource_type: 'image',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' },
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
            message: 'Avatar uploaded successfully',
            data: {
                url: result.secure_url,
                publicId: result.public_id,
            },
        });
    } catch (error) {
        console.error('Error uploading mentor avatar:', error);
        res.status(500).json({ message: 'Avatar upload failed' });
    }
};

export default uploadMentorAvatar;
