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
BACKEND_URL="http://localhost:3000"
```

**Note**: For Gmail App Password, you need to enable 2-Step Verification and generate an App Password.
Set `BACKEND_URL` to the public backend URL in production so signup confirmation
links open the deployed API.

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

Use the **Try it out** button in Swagger UI to call endpoints such as `GET /publication`, `GET /publication/{id}`, `POST /publication/submit`, `POST /publication/upload-image`, `POST /publication/delete-image`, `GET /mentor`, `POST /mentor/submit`, `POST /mentor/upload-avatar`, and `GET /news`.

## 📦 API Endpoints

### Get Publications

**GET** `/publication`

Retrieve all publications, sorted by newest first.

### Get Publication By ID

**GET** `/publication/{id}`

Retrieve one publication by MongoDB ObjectId.

### Submit Publication

**POST** `/publication/submit`

Submit a new publication.

**Request Body:**
```json
{
    "publishTitle": "Research Title",
    "author": "Author Name",
    "publishDate": "2023-10-26",
    "content": "Publication content...",
    "authorGmail": "[EMAIL_ADDRESS]",
    "doi": "https://doi.org/10.1016/example",
    "journal": "Journal of Experimental Software Systems"
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

**GET** `/mentor`

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

**POST** `/publication/upload-image`

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

**POST** `/publication/delete-image`

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

### Submit Mentor Profile

**POST** `/mentor/submit`

Submit or update a pending mentor profile. Existing pending profiles are matched by `email`. The JSON keys must be camelCase.

**Request Body:**
```json
{
    "title": "Dr.",
    "fullName": "Mentor Name",
    "department": "Computer Science",
    "phone": "+84 901 234 567",
    "email": "mentor@example.com",
    "personalWebsite": "https://example.com",
    "orcid": "0000-0000-0000-0000",
    "researchGate": "https://www.researchgate.net/profile/example",
    "googleScholar": "https://scholar.google.com/citations?user=example",
    "researchAreas": "Artificial Intelligence",
    "researchTopics": "Machine learning, computer vision",
    "note": "Available for undergraduate research mentoring.",
    "avatarImage": "https://drive.google.com/file/d/example/view"
}
```

### Upload Mentor Avatar

**POST** `/mentor/upload-avatar`

Upload a mentor avatar image. Send multipart form data with the field name `avatar`.

**Response:**
```json
{
    "message": "Avatar uploaded successfully",
    "data": {
        "url": "https://res.cloudinary.com/example/image/upload/avatar.jpg",
        "publicId": "src2026/mentors/avatar"
    }
}
```

### Get News

**GET** `/news`

Retrieve all news articles, sorted by newest first.
