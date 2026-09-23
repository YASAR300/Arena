/**
 * Swagger / OpenAPI 3.0 configuration
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Feedants Arena API',
      version: '1.0.0',
      description:
        'Production-grade REST API for the Feedants Competition Platform. ' +
        'Serves the Competition Details screen with real-time spot updates via Socket.IO.',
      contact: { name: 'Feedants Engineering', email: 'engineering@feedants.com' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
      { url: 'https://api.feedants.com', description: 'Production server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token. Obtain from /api/auth/login or /api/auth/signup',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            errorCode: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        Competition: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Feedants Classical Dance' },
            slug: { type: 'string', example: 'feedants-classical-dance' },
            categoryTags: { type: 'array', items: { type: 'string' }, example: ['Dance', 'Multi-Win'] },
            prizePool: { type: 'number', example: 1500 },
            entryFee: { type: 'number', example: 99 },
            totalSpots: { type: 'number', example: 20 },
            spotsBooked: { type: 'number', example: 1 },
            spotsLeft: { type: 'number', example: 19 },
            registrationEndAt: { type: 'string', format: 'date-time' },
            currentUserState: {
              type: 'object',
              properties: {
                isRegistered: { type: 'boolean' },
                competitionLifecycleStatus: { type: 'string' },
                canRegister: { type: 'boolean' },
                canSubmit: { type: 'boolean' },
                ctaLabel: { type: 'string', example: 'Register Now' },
                ctaAction: { type: 'string', example: 'REGISTER' },
              },
            },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Yasar Khan' },
            email: { type: 'string', format: 'email', example: 'yasar@example.com' },
            phone: { type: 'string', example: '9876543210' },
            password: { type: 'string', format: 'password', minLength: 6 },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            password: { type: 'string', format: 'password' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                referralCode: { type: 'string' },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        VerifyPaymentRequest: {
          type: 'object',
          required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'],
          properties: {
            razorpay_order_id: { type: 'string' },
            razorpay_payment_id: { type: 'string' },
            razorpay_signature: { type: 'string' },
          },
        },
        SubmissionRequest: {
          type: 'object',
          required: ['mediaUrl', 'mediaType'],
          properties: {
            mediaUrl: { type: 'string', format: 'uri' },
            mediaType: { type: 'string', enum: ['video/mp4', 'video/quicktime', 'url'] },
            thumbnailUrl: { type: 'string', format: 'uri' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and token management' },
      { name: 'Competitions', description: 'Competition discovery and details' },
      { name: 'Registration', description: 'Competition registration and spot booking' },
      { name: 'Submissions', description: 'Competition entry submission' },
      { name: 'Referrals', description: 'Refer and Earn system' },
      { name: 'Judges', description: 'Judge profile endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
