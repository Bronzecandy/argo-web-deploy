import { computeZkLoginAddress } from '@mysten/sui/zklogin';
import { parseJWT } from './jwt';

export function jwtToAddress(
  jwt: string,
  userSalt: string | bigint,
  legacyAddress: boolean = false,
): string {
  const decodedJWT = parseJWT(jwt);

  return computeZkLoginAddress({
    userSalt,
    claimName: 'sub',
    claimValue: decodedJWT.sub,
    aud: decodedJWT.aud,
    iss: decodedJWT.iss,
    legacyAddress,
  });
}
