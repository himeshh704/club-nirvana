import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.QR_JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';

export interface QRTicketPayload {
  i: string; // ticketId
  n: string; // name
  t: string; // ticketType
  tb?: string; // table number
  gc?: number; // guest count
  cv?: string; // cover credit amount
}

/**
 * Signs a ticket payload to create a secure, tamper-proof QR code token.
 */
export function signQRToken(payload: QRTicketPayload): string {
  try {
    return jwt.sign(payload, JWT_SECRET);
  } catch (error) {
    console.error('Error signing QR Token:', error);
    throw new Error('Failed to sign QR code.');
  }
}

/**
 * Verifies a QR code token's cryptographic signature and returns the payload.
 * Throws if the signature is invalid or tampered with.
 */
export function verifyQRToken(token: string): QRTicketPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as QRTicketPayload;
  } catch (error) {
    console.error('Error verifying QR Token:', error);
    throw new Error('Invalid or tampered QR code token.');
  }
}
