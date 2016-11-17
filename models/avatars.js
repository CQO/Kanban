//上传头像限制
Avatars = new FS.Collection('avatars', {
  stores: [
    new FS.Store.GridFS('avatars'),
  ],
  filter: {
    maxSize: 72000,
    allow: {
      contentTypes: ['image/*'],
    },
  },
});
//判断是否是本人
function isOwner(userId, file) {
  return userId && userId === file.userId;
}

Avatars.allow({
  insert: isOwner,
  update: isOwner,
  remove: isOwner,
  download() { return true; },
  fetch: ['userId'],
});

Avatars.files.before.insert((userId, doc) => {
  doc.userId = userId;
});