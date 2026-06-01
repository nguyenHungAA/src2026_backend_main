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

## 📦 API Endpoints

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
