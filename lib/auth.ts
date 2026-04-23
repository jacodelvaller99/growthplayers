import AsyncStorage from '@react-native-async-storage/async-storage';

// Admin credentials (hardcoded for initial setup)
const ADMIN_EMAIL = 'jacodelvalle@gmail.com';
const ADMIN_PASSWORD = '1233192770Jac@';

export interface User {
  id: string;
  email: string;
  nombre: string;
  isAdmin: boolean;
  token: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Hash password (nunca almacenar en texto plano)
 * Usa base64 encoding para ofuscación básica
 */
function hashPassword(password: string): string {
  return btoa(`salt_lifeflow_${password}_salt`);
}

/**
 * Generar JWT simple (sin dependencias externas)
 */
function generateToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 días
  }));
  const signature = 'signature'; // En producción, sign properly
  return `${header}.${payload}.${signature}`;
}

/**
 * Login con email y contraseña
 */
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Validar formato
    if (!email || !password) {
      return { success: false, error: 'Email y contraseña requeridos' };
    }

    // Verificar si es el admin
    if (email === ADMIN_EMAIL) {
      const hashedPassword = hashPassword(password);
      const hashedAdminPassword = hashPassword(ADMIN_PASSWORD);

      if (hashedPassword !== hashedAdminPassword) {
        return { success: false, error: 'Credenciales inválidas' };
      }

      // Admin login exitoso
      const user: User = {
        id: 'admin_001',
        email: ADMIN_EMAIL,
        nombre: 'Jaco del Valle',
        isAdmin: true,
        token: generateToken(),
        createdAt: Date.now(),
      };

      // Guardar en AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('token', user.token);

      return { success: true, user };
    }

    // Verificar si el usuario existe en la BD local
    const usersJson = await AsyncStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    const existingUser = users.find((u: any) => u.email === email);
    if (!existingUser) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Verificar contraseña
    const hashedPassword = await hashPassword(password);
    if (existingUser.hashedPassword !== hashedPassword) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    // Login exitoso
    const user: User = {
      ...existingUser,
      token: generateToken(),
    };

    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('token', user.token);

    return { success: true, user };
  } catch (e) {
    console.error('Login error:', e);
    return { success: false, error: 'Error en el servidor' };
  }
}

/**
 * Sign up (crear nuevo usuario)
 */
export async function signupUser(
  email: string,
  password: string,
  nombre: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    if (!email || !password || !nombre) {
      return { success: false, error: 'Todos los campos son requeridos' };
    }

    if (password.length < 8) {
      return { success: false, error: 'La contraseña debe tener mínimo 8 caracteres' };
    }

    // Verificar que no exista
    const usersJson = await AsyncStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    if (users.find((u: any) => u.email === email)) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Crear usuario
    const hashedPassword = hashPassword(password);
    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      nombre,
      isAdmin: false,
      token: generateToken(),
      createdAt: Date.now(),
    };

    // Guardar en lista de usuarios
    users.push({
      ...newUser,
      hashedPassword, // Solo guardar en la BD, no en sesión
    });

    await AsyncStorage.setItem('users', JSON.stringify(users));
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    await AsyncStorage.setItem('token', newUser.token);

    return { success: true, user: newUser };
  } catch (e) {
    console.error('Signup error:', e);
    return { success: false, error: 'Error en el servidor' };
  }
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
  } catch (e) {
    console.error('Logout error:', e);
  }
}

/**
 * Restaurar sesión (verificar si hay token válido)
 */
export async function restoreSession(): Promise<User | null> {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (!userJson) return null;

    const user: User = JSON.parse(userJson);

    // En producción, verificar token en servidor
    // Por ahora, asumimos que si existe en AsyncStorage, es válido
    return user;
  } catch (e) {
    console.error('Restore session error:', e);
    return null;
  }
}

/**
 * Verificar si token es válido (básico)
 */
export async function isTokenValid(token: string): Promise<boolean> {
  try {
    // En producción, validar contra servidor
    // Por ahora, verificar que exista en AsyncStorage
    const storedToken = await AsyncStorage.getItem('token');
    return storedToken === token;
  } catch {
    return false;
  }
}
