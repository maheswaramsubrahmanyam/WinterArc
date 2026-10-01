import {auth,db,ensureProfile,$} from './common.js';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,sendPasswordResetEmail,updateProfile,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
let mode='login',busy=false;
const msg=t=>{$('#msg').textContent=t||''};
const nice=e=>({'auth/invalid-credential':'Wrong email or password.','auth/user-not-found':'No account with that email.','auth/wrong-password':'Wrong email or password.','auth/email-already-in-use':'That email already has an account. Try logging in.','auth/weak-password':'Use a password with at least 6 characters.','auth/invalid-email':'Enter a valid email address.','auth/popup-closed-by-user':'Google sign-in was closed.','auth/too-many-requests':'Too many attempts. Wait a minute and try again.','auth/network-request-failed':'Network problem. Check your connection.'}[e.code]||e.message);
function setMode(m){mode=m;msg('');const s=m==='signup';$('#sf').style.display=s?'':'none';$('#cf').style.display=s?'':'none';$('#go').textContent=s?'Create my account':'Log in';$('#tl').classList.toggle('on',!s);$('#ts').classList.toggle('on',s);$('#pw').autocomplete=s?'new-password':'current-password';}
$('#tl').onclick=()=>setMode('login');$('#ts').onclick=()=>setMode('signup');
const q=new URLSearchParams(location.search);if(q.get('mode')==='signup')setMode('signup');if(q.get('disabled'))msg('This account has been disabled by the admin.');
$('#f').onsubmit=async e=>{
  e.preventDefault();msg('');const email=$('#email').value.trim(),pw=$('#pw').value;
  if(!email||!pw)return msg('Enter your email and password.');
  busy=true;$('#go').disabled=true;
  try{
    if(mode==='signup'){
      const name=$('#name').value.trim(),user=$('#user').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
      if(!name)throw {message:'Enter your full name.'};if(!user)throw {message:'Choose a username (letters, numbers, _).'};
      if(pw!==$('#pw2').value)throw {message:'Passwords do not match.'};
      const c=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(c.user,{displayName:name});
      await ensureProfile(c.user,{name,username:user});location.href='onboarding.html';
    }else{await signInWithEmailAndPassword(auth,email,pw);location.href='dashboard.html';}
  }catch(er){msg(nice(er));busy=false;$('#go').disabled=false;}
};
$('#gg').onclick=async()=>{busy=true;try{const c=await signInWithPopup(auth,new GoogleAuthProvider());await ensureProfile(c.user);location.href='dashboard.html';}catch(er){msg(nice(er));busy=false}};
$('#fp').onclick=async e=>{e.preventDefault();const em=$('#email').value.trim();if(!em)return msg('Type your email above first, then tap Forgot password.');
  try{await sendPasswordResetEmail(auth,em);msg('');alert('Password reset email sent. Check your inbox.');}catch(er){msg(nice(er))}};
onAuthStateChanged(auth,u=>{if(u&&!busy)location.replace('dashboard.html')});
