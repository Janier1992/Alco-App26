
import type { User } from './types';

export const VALID_USERS: User[] = [
  {
    id: '1',
    email: 'inspector@alco.com',
    password: 'password123',
    username: 'Inspector',
    role: 'Quality Inspector',
  },
  {
    id: '2',
    email: 'supervisor@alco.com',
    password: 'password456',
    username: 'Supervisor',
    role: 'Production Supervisor',
  },
  {
    id: '3',
    email: 'gerente@alco.com',
    password: 'password789',
    username: 'Gerente',
    role: 'Plant Manager',
  },
];
