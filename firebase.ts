// Local mock database and authentication

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'User' | 'Manager' | 'Admin';
  password?: string;
}

// Initial default users
const DEFAULT_USERS: LocalUser[] = [
  {
    uid: 'admin-id',
    email: 'cyber.kan587@gmail.com',
    displayName: 'Administrateur',
    role: 'Admin',
    password: 'admin'
  }
];

// Load users from localStorage or initialize with defaults
const getLocalUsers = (): LocalUser[] => {
  const users = localStorage.getItem('globalFiles_local_users');
  if (users) {
    try {
      return JSON.parse(users);
    } catch {
      return DEFAULT_USERS;
    }
  }
  localStorage.setItem('globalFiles_local_users', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

// Listeners for auth state changes
type AuthStateCallback = (user: LocalUser | null) => void;
const listeners = new Set<AuthStateCallback>();

const getCurrentUserFromStorage = (): LocalUser | null => {
  const cur = localStorage.getItem('globalFiles_currentUser');
  if (cur) {
    try {
      return JSON.parse(cur);
    } catch {
      return null;
    }
  }
  return null;
};

export const auth = {
  currentUser: getCurrentUserFromStorage()
};

// No-op for db, as we do everything local now
export const db = {};

export const googleProvider = {};

// Supprime l'authentification Google
export const loginWithGoogle = async () => {
  alert("L'authentification Google a été supprimée au profit de la connexion locale.");
  throw new Error("Google auth is disabled.");
};

export const loginWithEmail = async (email: string, pass: string) => {
  const users = getLocalUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!found) {
    throw new Error("Utilisateur non trouvé.");
  }
  if (found.password && found.password !== pass) {
    throw new Error("Mot de passe incorrect.");
  }

  const sessionUser = { ...found };
  delete sessionUser.password;

  localStorage.setItem('globalFiles_currentUser', JSON.stringify(sessionUser));
  auth.currentUser = sessionUser;

  // Trigger listeners
  listeners.forEach(cb => cb(sessionUser));
  return sessionUser;
};

export const logout = async () => {
  localStorage.removeItem('globalFiles_currentUser');
  auth.currentUser = null;
  listeners.forEach(cb => cb(null));
};

export const onAuthStateChanged = (authObj: unknown, callback: AuthStateCallback) => {
  listeners.add(callback);
  // Call immediately with current state
  callback(getCurrentUserFromStorage());
  return () => {
    listeners.delete(callback);
  };
};

export const registerUserWithoutLoggingIn = async (email: string, pass: string, name: string, role: 'User' | 'Manager' | 'Admin' = 'User') => {
  const users = getLocalUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    const err = new Error("Cet email est déjà utilisé.") as Error & { code?: string };
    err.code = 'auth/email-already-in-use';
    throw err;
  }

  const newUser: LocalUser = {
    uid: 'local-' + Math.random().toString(36).substr(2, 9),
    email,
    displayName: name,
    role,
    password: pass
  };

  users.push(newUser);
  localStorage.setItem('globalFiles_local_users', JSON.stringify(users));
  return newUser;
};
