import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  const { userId } = locals.auth();
  return { userId };
};
