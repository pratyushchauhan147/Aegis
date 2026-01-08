import { notifyContacts } from './notify.js'; // Adjust path to where you saved your nodemailer code

export default async function testEmailRoute(fastify, options) {
  
  // Test Route: GET /test-email
  fastify.get('/', async (req, reply) => {
    try {
      // 1. Mock Data simulating a real incident
      const mockData = {
        userName: 'TestUser_Alpha',
        lat: 40.7128,
        lng: -74.0060
      };

      // 2. Trigger the function
      await notifyContacts('user-123', 'INCIDENT_STARTED', mockData);

      return { success: true, message: 'Check your inbox! Email sent.' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Email failed to send', details: err.message });
    }
  });
}