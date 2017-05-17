"use strict";
// 我们读取用户所在地语言并把它设置成默认语言
// 它来自浏览器默认的信息，默认语言为英语

Meteor.startup(() => {
  Tracker.autorun(() => {
    const currentUser = Meteor.user();
    let language;
    if (currentUser) {
      language = currentUser.profile && currentUser.profile.language;
    }

    if (!language) {
      if(navigator.languages) {
        language = navigator.languages[0];
      } else {
        language = navigator.language || navigator.userLanguage;
      }
    }
  });
});
