import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Accio Recipe API',
      version: '1.0.0',
      description: 'API documentation for Accio Recipe application.',
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'next-auth.session-token', // For next-auth
          description: 'NextAuth Session Cookie',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['src/app/api/**/*.ts'], // Path to the API routes
};

export const getApiDocs = async () => {
  return swaggerJSDoc(swaggerOptions);
};
