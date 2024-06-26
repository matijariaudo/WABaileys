const {Router}=require('express');
const { instanceCreate, instanceGet, instanceInit, instanceContacts,  instanceEdit, instanceSendText, instanceChat, instanceMessage, instanceMedia, instanceDelete, instanceSendMedia } = require('../controllers/instancePost');
const { checkUserJWT, checkInstanceCreate, checkInstanceDelete, checkInstanceEdit, checkInstanceID, checkInstanceGet, checkInstanceChat, checkInstanceMessage, checkInstanceSendMessage, checkInstanceSendMedia } = require('../helpers/validaciones');

const router=Router()



//Phones administration
router.post('/instance/create',checkInstanceCreate,instanceCreate);
router.post('/instance/delete',checkInstanceID,instanceDelete);
router.post('/instance/edit',checkInstanceEdit,instanceEdit);
router.post('/instance/init',checkInstanceID,instanceInit);
router.post('/instance/get',checkInstanceGet,instanceGet);

router.post('/instance/contacts',checkInstanceID,instanceContacts);

router.post('/instance/chat',checkInstanceChat,instanceChat);
router.post('/instance/message',checkInstanceMessage,instanceMessage);
router.post('/instance/media',checkInstanceMessage,instanceMedia);
router.post('/instance/send',checkInstanceSendMessage,instanceSendText);
router.post('/instance/sendmedia',checkInstanceSendMedia,instanceSendMedia);

module.exports=router