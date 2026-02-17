
import { User } from '../types';

const BASE_URL = 'http://137.131.223.126:5678/webhook';

export const n8nService = {
  async saveUser(user: User) {
    try {
      await fetch(`${BASE_URL}/save-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
    } catch (err) {
      console.error('Error saving user:', err);
    }
  },

  async deleteUser(id: string) {
    try {
      await fetch(`${BASE_URL}/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  },

  async updateAbsenceStatus(id: string, status: 'approved' | 'rejected') {
    const payloadStatus = status === 'approved' ? 'aprovado' : 'rejeitado';
    try {
      const response = await fetch(`${BASE_URL}/validaAusencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: payloadStatus }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error updating absence status:', err);
    }
  }
};
