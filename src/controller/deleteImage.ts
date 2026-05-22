import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary.js';

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { publicId } = req.body;

        if (!publicId) {
            res.status(400).json({ message: 'publicId is required' });
            return;
        }

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            res.status(200).json({ message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ message: 'Image not found on Cloudinary' });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ message: 'Image deletion failed' });
    }
};

export default deleteImage;
