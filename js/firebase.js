// Initialize Firebase
(() => {
  const config = {
    apiKey: "AIzaSyA_4e_nej4uY5MOXkk3B-FzNBG3nawXGBY",
    authDomain: "fir-practice-f9bd3.firebaseapp.com",
    databaseURL: "https://fir-practice-f9bd3.firebaseio.com",
    projectId: "fir-practice-f9bd3",
    storageBucket: "fir-practice-f9bd3.appspot.com",
    messagingSenderId: "262407983466"
  };
  firebase.initializeApp(config);
  const db = firebase.firestore();
  app.db = db;
})();