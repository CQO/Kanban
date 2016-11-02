Meteor.subscribe('boards');
BlazeLayout.setRoot('body');

const i18nTagToT9n = (i18nTag) => {
  return i18nTag;
};

Template.userFormsLayout.onRendered(() => {
  const i18nTag = navigator.language;
  if (i18nTag) {
    console.log("sd");
    T9n.setLanguage(i18nTagToT9n(i18nTag));
  }
  EscapeActions.executeAll();
});

Template.userFormsLayout.helpers({
  languages() {
    return _.map(TAPi18n.getLanguages(), (lang, tag) => {
      const name = lang.name;
      return { tag, name };
    });
  },

  isCurrentLanguage() {
    const t9nTag = i18nTagToT9n(this.tag);
    const curLang = T9n.getLanguage().replace("_","-") || 'zh-CN';
    return t9nTag === curLang;
  },
});

Template.userFormsLayout.events({
  'change .js-userform-set-language'(evt) {
    console.log("s1d");
    const i18nTag = $(evt.currentTarget).val();
    T9n.setLanguage(i18nTagToT9n(i18nTag));
    evt.preventDefault();
  },
});

Template.defaultLayout.events({
  'click .js-close-modal': () => {
    Modal.close();
  },
});
