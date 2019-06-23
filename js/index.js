const { db, getElement, setEventHandlers, createElement, modifyElement, removeChilds } = app;

app.init = () => {
  const id = getElement('.currently-login .id').value;
  app.state.CURRENT_USER_ID = id;
  $('.ui.radio.checkbox').checkbox();
  setEventHandlers(getElement('.button.change-user'), { click: handleChangeUserEvent });
  setEventHandlers(getElement('.button.registeration'), { click: handleRegisterUserEvent });
  setEventHandlers(getElement('.button.post'), { click: handleNewPostEvent });
  setEventHandlers(getElement('.button.friend-requesting'), { click: handleFriendRequestEvent });
  setEventHandlers(getElement('.button.post-searching'), { click: handleSearchPostEvent });
  setEventHandlers(getElement('.ui.list.friends'), { click: handleFriendResponseEvent });
  initialUserDropdown($('.currently-login .ui.dropdown'), (user) => user.id !== id);
  initialUserDropdown($('.friend-requesting .ui.dropdown'), (user) => user.id !== id);
  initialUserDropdown($('.post-searching .ui.dropdown'));
  realtimeUpdatePosts();
  realtimeUpdateFriendsList();
}

const getAllUsers = async () => {
  const querySnapshot = await db.collection('members').get();
  const users = querySnapshot.docs.map((doc) => {
    let user = {};
    user = doc.data();
    user.id = doc.id;
    user.value = doc.id;
    return user;
  });
  return users;
}

const initialUserDropdown = async (element = $('.ui.dropdown'), condition) => {
  let users = await getAllUsers();
  if (condition) {
    users = users.filter(condition);
  }
  element.dropdown({
    values: users,
    placeholder: 'user',
    clearable: true
  });
}

const handleChangeUserEvent = async (e) => {
  e.preventDefault();
  const id = $('.currently-login .ui.dropdown').dropdown('get value');
  if (!id) return;
  const idInput = getElement('.currently-login .id');
  const emailInput = getElement('.currently-login .email');
  const nameInput = getElement('.currently-login .name');
  const doc = await db.collection('members').doc(id).get();
  if (!doc.exists) return;
  const { email, name } = doc.data();
  emailInput.value = email;
  nameInput.value = name;
  idInput.value = id;
  app.state.CURRENT_USER_ID = id;
  initialUserDropdown($('.currently-login .ui.dropdown'), (user) => user.id !== id);
  initialUserDropdown($('.friend-requesting .ui.dropdown'), (user) => user.id !== id);
  if (app.state.realtimeFriends) app.state.realtimeFriends();
  realtimeUpdateFriendsList();
}

const handleRegisterUserEvent = async (e) => {
  e.preventDefault();
  const email = getElement('.registeration .email').value;
  const name = getElement('.registeration .name').value;
  if (!email || !name) return;
  try {
    const docRef = await db.collection('members').add({ email, name });
    console.log("Document written with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding document: ", error);
  }
}

const handleNewPostEvent = async (e) => {
  e.preventDefault();
  const { CURRENT_USER_ID } = app.state;
  const title = getElement('.new-post .title').value;
  const content = getElement('.new-post .content').value;
  const tag = getElement('.new-post .ui.radio.checkbox.checked label');
  if (!CURRENT_USER_ID || !title || !content || !tag) return;
  try {
    const docRef = await db.collection('posts')
      .add({
        member_id: db.doc(`members/${CURRENT_USER_ID}`),
        title,
        content,
        tags: [tag.textContent.toLowerCase()],
        created_time: firebase.firestore.FieldValue.serverTimestamp()
      });
    console.log("Document written with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding document: ", error);
  }
}

const getUserById = async (id) => {
  const querySnapshot = await db.collection('members').doc(id).get();
  return querySnapshot;
}

const setUserAndFriendStatus = (userStatus, friendStatus) => {
  /*
    {
      "0": "refuse to be friend",
      "1": "is friend",
      "2": "sending request",
      "3": "receiving request"
    }
  */
  if (!userStatus || !friendStatus) return;
  const statusList = [0, 1, 2, 3];
  const { CURRENT_USER_ID, FRIEND_ID } = app.state;

  statusList.forEach((status) => {
    const userDoc = db.collection('members').doc(CURRENT_USER_ID);
    const friendDoc = db.collection('members').doc(FRIEND_ID);

    if (status === userStatus) {
      userDoc.update({
        friends: firebase.firestore.FieldValue.arrayUnion({ member_id: db.doc(`/members/${FRIEND_ID}`), status })
      });
    } else {
      userDoc.update({
        friends: firebase.firestore.FieldValue.arrayRemove({ member_id: db.doc(`/members/${FRIEND_ID}`), status })
      });
    }

    if (status === friendStatus) {
      friendDoc.update({
        friends: firebase.firestore.FieldValue.arrayUnion({ member_id: db.doc(`/members/${CURRENT_USER_ID}`), status })
      });
    } else {
      friendDoc.update({
        friends: firebase.firestore.FieldValue.arrayRemove({ member_id: db.doc(`/members/${CURRENT_USER_ID}`), status })
      });
    }
  });
}

const handleFriendRequestEvent = async (e) => {
  e.preventDefault();
  const id = $('.friend-requesting .ui.dropdown').dropdown('get value');
  if (!id) return;
  const user = await getUserById(id);
  if (!user.exists) {
    return document.querySelector('.friend-requesting .form').classList.add('warning');
  }
  document.querySelector('.friend-requesting .friend-name').textContent = user.data().name;
  document.querySelector('.friend-requesting .form').classList.add('success');
  setTimeout(() => document.querySelector('.friend-requesting .form').classList.remove('warning', 'success'), 3000);
  app.state.FRIEND_ID = id;
  setUserAndFriendStatus(2, 3);
}

const getUsername = async (member_id) => {
  const snap = await member_id.get();
  return snap.data().name;
}

const buildPosts = async (querySnapshot) => {
  const promises = querySnapshot.docs.map(async (doc) => {
    const post = doc.data();
    const { created_time, member_id } = post;
    if (created_time) {
      post.created_time = app.convertDate(created_time.toDate());
    }
    if (member_id) {
      const username = await getUsername(member_id);
      post.name = username;
    }
    return post;
  });
  const posts = await Promise.all(promises);
  return posts;
}

const searchPosts = async (id, tag) => {
  let query = db.collection('posts');
  if (id) {
    query = query.where('member_id', '==', db.doc(`members/${id}`));
  }
  if (tag) {
    query = query.where('tags', 'array-contains', tag.textContent.toLowerCase());
  }
  const querySnapshot = await query.get();
  const posts = buildPosts(querySnapshot);
  return posts;
}

const generateTagElements = (tags) => {
  if (!tags) return '';
  const tagColors = {
    'beauty': 'black',
    'gossiping': 'teal',
    'joke': 'blue',
    'school life': 'green'
  };
  const tagElements = tags.map((tag) => {
    settings = {
      attributes: {
        class: `ui label ${tagColors[tag] || 'black'}`
      }
    }
    const tagName = tag.replace(/(\b\w)/gi, (c) => c.toUpperCase());
    const tagElement = createElement('a', settings, null, tagName);
    return tagElement;
  });
  return tagElements;
}

const generatePostsBlock = (posts) => {
  const postsBlock = posts.map((post) => {
    const { title, content, name, tags, created_time } = post;
    const tagElements = generateTagElements(tags);
    const card = createElement('div', { attributes: { class: 'card' } });
    const contentElement = createElement('div', { attributes: { class: 'content' } }, card);
    createElement('div', { attributes: { class: 'header' } }, contentElement, title);
    const meta = createElement('div', { attributes: { class: 'meta' } }, contentElement);
    createElement('span', { attributes: { class: 'name' } }, meta, name);
    createElement('span', { attributes: { class: 'right floated time' } }, meta, `${created_time || ''}`);
    createElement('div', { attributes: { class: 'description' } }, contentElement, content);
    if (tagElements) {
      const extraContent = createElement('div', { attributes: { class: 'extra content' } }, card);
      createElement('div', { attributes: { class: 'right floated' } }, extraContent, tagElements);
    }
    return card;
  });
  return postsBlock;
}

const handleSearchPostEvent = async (e) => {
  e.preventDefault();
  const id = $('.post-searching .ui.dropdown').dropdown('get value');
  const tag = getElement('.post-searching .ui.radio.checkbox.checked label');
  if (!id && !tag) return;
  const posts = await searchPosts(id, tag);
  const postsBlock = generatePostsBlock(posts);
  const cards = getElement('.ui.cards');
  removeChilds(cards);
  modifyElement(cards, null, null, postsBlock);
}

const handleRealtimeUpdatePosts = async (querySnapshot) => {
  const posts = await buildPosts(querySnapshot);
  const postsBlock = generatePostsBlock(posts);
  const cards = getElement('.ui.cards');
  removeChilds(cards);
  modifyElement(cards, null, null, postsBlock);
}

const realtimeUpdatePosts = () => {
  db.collection('posts').onSnapshot(handleRealtimeUpdatePosts);
}

const buildFriendsList = async (friends) => {
  const promises = friends.map(async ({ member_id, status }) => {
    if (typeof member_id === "string") {
      return { status };
    } else {
      const friend = await member_id.get();
      const friendData = friend.data();
      friendData.id = member_id.id;
      friendData.status = status;
      return friendData;
    }
  });
  const friendsList = await Promise.all(promises);
  return friendsList;
}

const generateUserStatusBlock = (status, id) => {
  const statusBlock = createElement('div', { attributes: { class: 'right floated content' } });
  if (status === 2) {
    createElement('div', { attributes: { class: 'ui label' } }, statusBlock, '已傳送好友邀請，等待回覆');
  } else if (status === 3) {
    const buttons = createElement('div', { attributes: { class: 'ui buttons', 'data-id': id } }, statusBlock);
    createElement('button', { attributes: { class: 'ui positive button' } }, buttons, 'Accept');
    createElement('div', { attributes: { class: 'or' } }, buttons);
    createElement('button', { attributes: { class: 'ui button', 'data-id': id } }, buttons, 'Cancel');
  }
  return statusBlock;
}

const generateFriendsBlock = (friendsList) => {
  if (!friendsList) return;
  const friendsBlock = friendsList.filter((friend) => friend.status).map((friend) => {
    const { id, email, name, status } = friend;
    const statusBlock = generateUserStatusBlock(status, id);
    const item = createElement('div', { attributes: { class: 'item' } }, null, statusBlock);
    createElement('img', { attributes: { class: 'ui avatar image', src: 'https://semantic-ui.com/images/wireframe/square-image.png' } }, item);
    const content = createElement('div', { attributes: { class: 'content' } }, item);
    createElement('span', { attributes: { class: 'header' } }, content, name);
    createElement('div', { attributes: { class: 'description' } }, content, email);
    return item;
  });
  return friendsBlock;
}

const handleRealtimeUpdateFriendsList = async (doc) => {
  if (!doc.exists) return;
  const { friends } = doc.data();
  if (!friends) return;
  const friendsList = await buildFriendsList(friends);
  const friendsBlock = generateFriendsBlock(friendsList);
  const list = getElement('.ui.list.friends');
  removeChilds(list);
  modifyElement(list, null, null, friendsBlock);
  const isFriends = friends.filter((friend) => friend.status).map((friend) => friend.member_id.id);
  initialUserDropdown($('.friend-requesting .ui.dropdown'), (user) => !isFriends.includes(user.id) && user.id !== app.state.CURRENT_USER_ID);
}

const realtimeUpdateFriendsList = () => {
  app.state.realtimeFriends = db.collection('members').doc(app.state.CURRENT_USER_ID).onSnapshot(handleRealtimeUpdateFriendsList);
};

const handleFriendResponseEvent = (e) => {
  const { target } = e;
  if (!target instanceof HTMLButtonElement) return;
  const { id } = target.closest('.ui.buttons').dataset;
  app.state.FRIEND_ID = id;
  if (target.classList.contains('positive')) {
    setUserAndFriendStatus(1, 1);
  } else {
    setUserAndFriendStatus(0, 0);
  }
}

window.addEventListener("DOMContentLoaded", app.init);