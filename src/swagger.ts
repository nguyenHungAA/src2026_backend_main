const messageResponse = {
    type: 'object',
    properties: {
        message: { type: 'string' },
    },
};

const swaggerDocument = {
    openapi: '3.0.3',
    info: {
        title: 'SRC2026 Backend API',
        version: '1.0.0',
        description: 'Interactive documentation for all mounted SRC2026 backend endpoints.',
    },
    servers: [
        {
            url: '/',
            description: 'Current server',
        },
    ],
    tags: [
        { name: 'System', description: 'Backend landing and documentation endpoints' },
        { name: 'Publications', description: 'Publication listing, detail, submission, and media endpoints' },
        { name: 'Mentors', description: 'Mentor directory endpoints' },
        { name: 'News', description: 'News article endpoints' },
    ],
    paths: {
        '/': {
            get: {
                tags: ['System'],
                summary: 'Backend landing page',
                responses: {
                    '200': {
                        description: 'HTML landing page with endpoint links',
                        content: {
                            'text/html': {
                                schema: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        '/openapi.json': {
            get: {
                tags: ['System'],
                summary: 'OpenAPI document',
                responses: {
                    '200': {
                        description: 'OpenAPI JSON specification',
                        content: {
                            'application/json': {
                                schema: { type: 'object' },
                            },
                        },
                    },
                },
            },
        },
        '/publication': {
            get: {
                tags: ['Publications'],
                summary: 'Get all publications',
                description: 'Retrieve all publications, sorted by newest first.',
                responses: {
                    '200': {
                        description: 'Publications fetched successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PublicationListResponse' },
                            },
                        },
                    },
                    '500': { $ref: '#/components/responses/InternalServerError' },
                },
            },
        },
        '/publication/{id}': {
            get: {
                tags: ['Publications'],
                summary: 'Get publication by ID',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'MongoDB ObjectId of the publication.',
                        schema: {
                            type: 'string',
                            example: '66507a6e8f8b2a0012d8b123',
                        },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Publication fetched successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PublicationResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'Invalid publication ID',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Invalid publication ID' },
                            },
                        },
                    },
                    '404': {
                        description: 'Publication not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Publication not found' },
                            },
                        },
                    },
                    '500': { $ref: '#/components/responses/InternalServerError' },
                },
            },
        },
        '/publication/submit': {
            post: {
                tags: ['Publications'],
                summary: 'Submit a publication',
                description: 'Create a publication and send a non-blocking notification email.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PublicationSubmitRequest' },
                            example: {
                                publishTitle: 'Research Title',
                                author: 'Author Name',
                                publishDate: '2026-05-22',
                                content: 'Publication content...',
                                authorGmail: 'author@example.com',
                                doi: 'https://doi.org/10.1016/example',
                                journal: 'Journal of Experimental Software Systems',
                                images: [
                                    {
                                        url: 'https://res.cloudinary.com/example/image/upload/sample.jpg',
                                        publicId: 'src2026/publications/sample',
                                    },
                                ],
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Publication submitted successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PublicationResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'Missing required fields',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Missing required fields' },
                            },
                        },
                    },
                    '500': { $ref: '#/components/responses/InternalServerError' },
                },
            },
        },
        '/publication/upload-image': {
            post: {
                tags: ['Publications'],
                summary: 'Upload a publication image',
                description: 'Upload an image to Cloudinary. The multipart form field must be named "image".',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['image'],
                                properties: {
                                    image: {
                                        type: 'string',
                                        format: 'binary',
                                        description: 'Image file, maximum 5MB.',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Image uploaded successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ImageUploadResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'No image file provided',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'No image file provided' },
                            },
                        },
                    },
                    '500': {
                        description: 'Image upload failed',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Image upload failed' },
                            },
                        },
                    },
                },
            },
        },
        '/publication/delete-image': {
            post: {
                tags: ['Publications'],
                summary: 'Delete a publication image',
                description: 'Delete an uploaded Cloudinary image by public ID.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/DeleteImageRequest' },
                            example: {
                                publicId: 'src2026/publications/sample',
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Image deleted successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Image deleted successfully' },
                            },
                        },
                    },
                    '400': {
                        description: 'publicId is required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'publicId is required' },
                            },
                        },
                    },
                    '404': {
                        description: 'Image not found on Cloudinary',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Image not found on Cloudinary' },
                            },
                        },
                    },
                    '500': {
                        description: 'Image deletion failed',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Image deletion failed' },
                            },
                        },
                    },
                },
            },
        },
        '/mentor': {
            get: {
                tags: ['Mentors'],
                summary: 'Get all mentors',
                description: 'Retrieve all mentors from the mentors database.',
                responses: {
                    '200': {
                        description: 'Mentors fetched successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MentorListResponse' },
                            },
                        },
                    },
                    '500': { $ref: '#/components/responses/InternalServerError' },
                },
            },
        },
        '/mentor/submit': {
            post: {
                tags: ['Mentors'],
                summary: 'Submit a mentor profile',
                description: 'Create or update a pending mentor profile from a JSON object. Existing pending profiles are matched by email.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/MentorProfileSubmitRequest' },
                            example: {
                                title: 'Dr.',
                                fullName: 'Mentor Name',
                                department: 'Computer Science',
                                phone: '+84 901 234 567',
                                email: 'mentor@example.com',
                                personalWebsite: 'https://example.com',
                                orcid: '0000-0000-0000-0000',
                                researchGate: 'https://www.researchgate.net/profile/example',
                                googleScholar: 'https://scholar.google.com/citations?user=example',
                                researchAreas: 'Artificial Intelligence',
                                researchTopics: 'Machine learning, computer vision',
                                note: 'Available for undergraduate research mentoring.',
                                avatarImage: 'https://drive.google.com/file/d/example/view',
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Mentor profile submitted successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MentorProfileResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'Missing required fields',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Missing required fields (title, fullName, email)' },
                            },
                        },
                    },
                    '500': { $ref: '#/components/responses/InternalServerError' },
                },
            },
        },
        '/mentor/upload-avatar': {
            post: {
                tags: ['Mentors'],
                summary: 'Upload a mentor avatar',
                description: 'Upload a square-cropped mentor avatar to Cloudinary. The multipart form field must be named "avatar".',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                required: ['avatar'],
                                properties: {
                                    avatar: {
                                        type: 'string',
                                        format: 'binary',
                                        description: 'Avatar image file, maximum 5MB.',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Avatar uploaded successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AvatarUploadResponse' },
                            },
                        },
                    },
                    '400': {
                        description: 'No image file provided',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'No image file provided' },
                            },
                        },
                    },
                    '500': {
                        description: 'Avatar upload failed',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/MessageResponse' },
                                example: { message: 'Avatar upload failed' },
                            },
                        },
                    },
                },
            },
        },
        '/news': {
            get: {
                tags: ['News'],
                summary: 'Get all news',
                description: 'Retrieve all news articles, sorted by newest first.',
                responses: {
                    '200': {
                        description: 'News fetched successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/NewsListResponse' },
                            },
                        },
                    },
                    '500': { $ref: '#/components/responses/InternalServerError' },
                },
            },
        },
    },
    components: {
        responses: {
            InternalServerError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/MessageResponse' },
                        example: { message: 'Internal server error' },
                    },
                },
            },
        },
        schemas: {
            MessageResponse: messageResponse,
            PublicationImage: {
                type: 'object',
                required: ['url', 'publicId'],
                properties: {
                    url: { type: 'string', format: 'uri' },
                    publicId: { type: 'string' },
                },
            },
            PublicationSubmitRequest: {
                type: 'object',
                required: ['publishTitle', 'author', 'publishDate', 'content', 'authorGmail'],
                properties: {
                    publishTitle: { type: 'string', example: 'Research Title' },
                    author: { type: 'string', example: 'Author Name' },
                    publishDate: { type: 'string', example: '2026-05-22' },
                    content: { type: 'string', example: 'Publication content...' },
                    authorGmail: { type: 'string', format: 'email', example: 'author@example.com' },
                    doi: {
                        type: 'string',
                        example: 'https://doi.org/10.1016/example',
                    },
                    journal: {
                        type: 'string',
                        example: 'Journal of Experimental Software Systems',
                    },
                    images: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/PublicationImage' },
                        default: [],
                    },
                },
            },
            Publication: {
                allOf: [
                    { $ref: '#/components/schemas/PublicationSubmitRequest' },
                    {
                        type: 'object',
                        properties: {
                            _id: { type: 'string', example: '66507a6e8f8b2a0012d8b123' },
                            feedback: { type: 'string', example: '' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                ],
            },
            PublicationResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Publication fetched successfully' },
                    data: { $ref: '#/components/schemas/Publication' },
                },
            },
            PublicationListResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Publications fetched successfully' },
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Publication' },
                    },
                },
            },
            DeleteImageRequest: {
                type: 'object',
                required: ['publicId'],
                properties: {
                    publicId: { type: 'string', example: 'src2026/publications/sample' },
                },
            },
            ImageUploadResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Image uploaded successfully' },
                    data: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                format: 'uri',
                                example: 'https://res.cloudinary.com/example/image/upload/sample.jpg',
                            },
                            publicId: { type: 'string', example: 'src2026/publications/sample' },
                        },
                    },
                },
            },
            Mentor: {
                type: 'object',
                additionalProperties: true,
                example: {
                    name: 'Mentor Name',
                    affiliation: 'University',
                    email: 'mentor@example.com',
                },
            },
            MentorListResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Mentors fetched successfully' },
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Mentor' },
                    },
                },
            },
            MentorProfileSubmitRequest: {
                type: 'object',
                required: ['title', 'fullName', 'email'],
                description: 'Strict camelCase JSON payload. Non-camelCase display-label keys are rejected.',
                properties: {
                    title: { type: 'string', description: 'Title (Học hàm/học vị)', example: 'Dr.' },
                    fullName: { type: 'string', description: 'Full Name (Họ và tên)', example: 'Mentor Name' },
                    department: {
                        type: 'string',
                        description: 'Department (Đơn vị công tác)',
                        example: 'Computer Science',
                    },
                    phone: { type: 'string', description: 'Phone (if available)', example: '+84 901 234 567' },
                    email: { type: 'string', format: 'email', example: 'mentor@example.com' },
                    personalWebsite: { type: 'string', format: 'uri', example: 'https://example.com' },
                    orcid: { type: 'string', example: '0000-0000-0000-0000' },
                    researchGate: {
                        type: 'string',
                        format: 'uri',
                        example: 'https://www.researchgate.net/profile/example',
                    },
                    googleScholar: {
                        type: 'string',
                        format: 'uri',
                        example: 'https://scholar.google.com/citations?user=example',
                    },
                    researchAreas: {
                        type: 'string',
                        description: 'Research Areas (Lĩnh vực nghiên cứu chính)',
                        example: 'Artificial Intelligence',
                    },
                    researchTopics: {
                        type: 'string',
                        description: 'Research Topics (Hướng nghiên cứu cụ thể)',
                        example: 'Machine learning, computer vision',
                    },
                    note: {
                        type: 'string',
                        description: 'Note (Ghi chú khác)',
                        example: 'Available for undergraduate research mentoring.',
                    },
                    avatarImage: {
                        type: 'string',
                        format: 'uri',
                        description: 'Avatar Image (Drive link)',
                        example: 'https://drive.google.com/file/d/example/view',
                    },
                },
            },
            MentorProfile: {
                allOf: [
                    { $ref: '#/components/schemas/MentorProfileSubmitRequest' },
                    {
                        type: 'object',
                        properties: {
                            _id: { type: 'string', example: '66507a6e8f8b2a0012d8b789' },
                            feedback: { type: 'string', example: '' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                ],
            },
            MentorProfileResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Mentor profile submitted successfully' },
                    data: { $ref: '#/components/schemas/MentorProfile' },
                },
            },
            AvatarUploadResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Avatar uploaded successfully' },
                    data: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                format: 'uri',
                                example: 'https://res.cloudinary.com/example/image/upload/avatar.jpg',
                            },
                            publicId: { type: 'string', example: 'src2026/mentors/avatar' },
                        },
                    },
                },
            },
            News: {
                type: 'object',
                properties: {
                    _id: { type: 'string', example: '66507a6e8f8b2a0012d8b456' },
                    title: { type: 'string', example: 'SRC2026 opens submissions' },
                    description: { type: 'string', example: 'Submission portal is now open.' },
                    image: {
                        type: 'string',
                        format: 'uri',
                        example: 'https://pub-16fd5c9400c848109b04c8a6aef2443a.r2.dev/fpt_logo.jpg',
                    },
                    date: { type: 'string', example: '2026-05-22' },
                    content: { type: 'string', example: 'News content...' },
                    author: { type: 'string', example: 'SRC2026 Team' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            NewsListResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'News fetched successfully' },
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/News' },
                    },
                },
            },
        },
    },
};

export default swaggerDocument;
