// lib/contactService.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

class ContactService {
  async submitContactForm(formData: ContactFormData): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to submit contact form');
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || 'Message sent successfully!',
      };
    } catch (error: any) {
      console.error('Contact form error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send message. Please try again.',
      };
    }
  }
}

export const contactService = new ContactService();
export type { ContactFormData };