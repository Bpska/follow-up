import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://ck38wvpa.ap-southeast.insforge.app',
  anonKey:  'ik_298dd34e631f8812c4a8f5046c2a2598',
});

export default insforge;
