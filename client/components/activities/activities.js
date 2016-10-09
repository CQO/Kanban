const activitiesPerPage = 20;

BlazeComponent.extendComponent({
  onCreated() {
    // XXX Should we use ReactiveNumber?
    this.page = new ReactiveVar(1);
    this.loadNextPageLocked = false;
    const sidebar = this.parentComponent(); // XXX for some reason not working
    sidebar.callFirstWith(null, 'resetNextPeak');
    this.autorun(() => {
      const mode = this.data().mode;
      const capitalizedMode = Utils.capitalize(mode);
      const id = Session.get(`current${capitalizedMode}`);
      const limit = this.page.get() * activitiesPerPage;
      if (id === null)
        return;

      this.subscribe('activities', mode, id, limit, () => {
        this.loadNextPageLocked = false;

        // If the sibear peak hasn't increased, that mean that there are no more
        // activities, and we can stop calling new subscriptions.
        // XXX This is hacky! We need to know excatly and reactively how many
        // activities there are, we probably want to denormalize this number
        // dirrectly into card and board documents.
        const nextPeakBefore = sidebar.callFirstWith(null, 'getNextPeak');
        sidebar.calculateNextPeak();
        const nextPeakAfter = sidebar.callFirstWith(null, 'getNextPeak');
        if (nextPeakBefore === nextPeakAfter) {
          sidebar.callFirstWith(null, 'resetNextPeak');
        }
      });
    });
  },

  loadNextPage() {
    if (this.loadNextPageLocked === false) {
      this.page.set(this.page.get() + 1);
      this.loadNextPageLocked = true;
    }
  },

  boardLabel() {
    return TAPi18n.__('this-board');
  },

  cardLabel() {
    return TAPi18n.__('this-card');
  },

  cardLink() {
    const card = this.currentData().card();
    return card && Blaze.toHTML(HTML.A({
      href: card.absoluteUrl(),
      'class': 'action-card',
    }, card.title));
  },

  listLabel() {
    return this.currentData().list().title;
  },

  sourceLink() {
    const source = this.currentData().source;
    if(source) {
      if(source.url) {
        return Blaze.toHTML(HTML.A({
          href: source.url,
        }, source.system));
      } else {
        return source.system;
      }
    }
    return null;
  },

  memberLink() {
    return Blaze.toHTMLWithData(Template.memberName, {
      user: this.currentData().member(),
    });
  },

  attachmentLink() {
    const attachment = this.currentData().attachment();
    // trying to display url before file is stored generates js errors
    return attachment && attachment.url({ download: true }) && Blaze.toHTML(HTML.A({
      href: FlowRouter.path(attachment.url({ download: true })),
      target: '_blank',
    }, attachment.name()));
  },

  events() {
    return [{
      // XXX We should use Popup.afterConfirmation here
      'click .js-delete-comment'() {
        const commentId = this.currentData().commentId;
        CardComments.remove(commentId);
      },
      'submit .js-edit-comment'(evt) {
        evt.preventDefault();
        const commentText = this.currentComponent().getValue().trim();
        const commentId = Template.parentData().commentId;
        if (commentText) {
          CardComments.update(commentId, {
            $set: {
              text: commentText,
            },
          });
        }
      },
    }];
  },
}).register('activities');
