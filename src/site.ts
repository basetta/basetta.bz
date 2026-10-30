export const site = {
  url: 'https://basetta.bz',
  title: "Basetta's Website",
  description: 'Welcome to my personal blog! Find honest reflections, helpful advice, and a fresh perspective on travel, lifestyle, and more. Start exploring now.',
  author: 'Patrick Martini',
};

export const isPreview = ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT ?? '');
export const pageSize = 5;
