BlazeComponent.extendComponent({
    //编辑清单标题事件
  editTitle(evt) {
    evt.preventDefault();
    const newTitle = this.childComponents('inlinedForm')[0].getValue().trim();
    const list = this.currentData();
    if (newTitle) {
      list.rename(newTitle.trim());
    }
  },

  limitToShowCardsCount() {
    return Meteor.user().getLimitToShowCardsCount();
  },

  showCardsCountForList(count) {
    return count > this.limitToShowCardsCount();
  },

  events() {
    return [{
      'click .js-open-list-menu': Popup.open('listAction'),
      submit: this.editTitle,
    }];
  },
}).register('listHeader');

Template.listActionPopup.helpers({
  isWatching() {
    console.log("err");
    return this.findWatcher(Meteor.userId());
  },
});

Template.listActionPopup.events({
  //添加新卡片事件
  'click .js-add-card'() {
    const listDom = document.getElementById(`js-list-${this._id}`);
    const listComponent = BlazeComponent.getComponentForElement(listDom);
    listComponent.openForm({ position: 'top' });
    Popup.close();
  },
  'click .js-list-subscribe'() {},
  //选择所有卡片按钮点击事件
  'click .js-select-cards'() {
    const cardIds = this.allCards().map((card) => card._id);
    MultiSelection.add(cardIds);
    Popup.close();
  },
  //归档按钮点击事件
  'click .js-close-list'(evt) {
    evt.preventDefault();
    this.archive();
    Popup.close();
  },
  'click .js-remove-list'(evt) {
    const currentList = this;
    evt.preventDefault();
    Lists.remove(currentList._id);
    Popup.close();
  },
});
