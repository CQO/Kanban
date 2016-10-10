"use strict";
// 我们读取用户所在地语言并把它设置成默认语言
// 它来自浏览器默认的信息，默认语言为英语

Tracker.autorun(() => {
  const currentUser = Meteor.user();
  if (currentUser&&currentUser.profile&& currentUser.profile.language) {
    const language = currentUser.profile && currentUser.profile.language;
    TAPi18n.setLanguage(language);
    const shortLanguage = language.split('-')[0];
    T9n.setLanguage(language);
  }
  else {
    const language = navigator.language || navigator.userLanguage;
    TAPi18n.setLanguage(language);
    //本来是const shortLanguage = language.split('-')[0];然后T9n.setLanguage(shortLanguage);
    T9n.setLanguage(language);
  }
});
