# SRC2026 Backend

This is the backend service for the SRC2026 (Science Research Festival 2026).

## 🚀 Features

- **Publication Submission**: Submit research publications with details.
- **Email Notifications**: Send email notifications for new submissions.
- **Mentor Management**: Retrieve list of mentors.

## 📋 Prerequisites

- Node.js 20.x
- MongoDB Atlas account

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SRC2026_Backend
```

2. Install dependencies:
```bash
pnpm install
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following credentials:

```env
MONGO_URI="mongodb+srv://<user>:<password>@<cluster-url>/?appName=publication"
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
NOTIFY_EMAIL="[EMAIL_ADDRESS]"
```

**Note**: For Gmail App Password, you need to enable 2-Step Verification and generate an App Password.

## 🏃‍♂️ Running the Server

Start the development server:
```bash
pnpm run dev
```

The server will start on `http://localhost:3000`.

If port `3000` is already in use, start the server on another port:

```powershell
$env:PORT=3001; pnpm run dev
```

## 🧪 Swagger Mock API

After starting the server, open Swagger UI to interact with the API from your browser:

```text
http://localhost:3000/swagger
```

The raw OpenAPI document is available at:

```text
http://localhost:3000/openapi.json
```

Use the **Try it out** button in Swagger UI to call endpoints such as `GET /publications`, `POST /publications/submit`, `POST /publications/upload-image`, `POST /publications/delete-image`, and `GET /mentors`.

## 📦 API Endpoints

### Get Publications

**GET** `/publications`

Retrieve all publications, sorted by newest first.

### Submit Publication

**POST** `/publications/submit`

Submit a new publication.

**Request Body:**
```json
{
    "publishTitle": "Research Title",
    "author": "Author Name",
    "publishDate": "2023-10-26",
    "content": "Publication content...",
    "authorGmail": "[EMAIL_ADDRESS]"
}
```

**Response:**
```json
{
    "message": "Publication submitted successfully",
    "data": {}
}
```

### Get Mentors

**GET** `/mentors`

Retrieve all mentors.

**Response:**
```json
{
    "message": "Mentors fetched successfully",
    "data": [
        {
            "name": "Mentor Name",
            "affiliation": "University",
            "email": "[EMAIL_ADDRESS]"
        }
    ]
}
```

### Upload Image

**POST** `/publications/upload-image`

Upload an image for a publication. Send multipart form data with the field name `image`.

**Response:**
```json
{
    "message": "Image uploaded successfully",
    "data": {
        "url": "https://res.cloudinary.com/example/image/upload/sample.jpg",
        "publicId": "src2026/publications/sample"
    }
}
```

### Delete Image

**POST** `/publications/delete-image`

Delete an uploaded image from Cloudinary.

**Request Body:**
```json
{
    "publicId": "src2026/publications/sample"
}
```

**Response:**
```json
{
    "message": "Image deleted successfully"
}
```
