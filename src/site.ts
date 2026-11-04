export const site = {
  url: 'https://basetta.bz',
  title: "Basetta's Website",
  description: 'Patrick Martini, aka Basetta, writes about developer tools, things he builds, and the occasional detour through life.',
  author: 'Patrick Martini',
};

export const isPreview = ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '');
export const pageSize = 5;
