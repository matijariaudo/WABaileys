const {Router}=require('express');
const { instanceCreate, instanceGet, instanceInit, instanceContacts,  instanceEdit, instanceSendText, instanceChat, instanceMessage, instanceMedia, instanceDelete, instanceSendMedia, instanceConsumption } = require('../controllers/instancePost');
const { checkInstanceCreate,  checkInstanceEdit, checkInstanceID, checkInstanceGet, checkInstanceChat, checkInstanceMessage, checkInstanceSendMessage, checkInstanceSendMedia, checkUserJWT } = require('../helpers/validaciones');

const router=Router()

//Instances administration
router.post('/instance/create',checkInstanceCreate,instanceCreate);
router.post('/instance/delete',checkInstanceID,instanceDelete);
router.post('/instance/edit',checkInstanceEdit,instanceEdit);
router.post('/instance/init',checkInstanceID,instanceInit);
router.post('/instance/get',checkInstanceGet,instanceGet);
router.post('/instance/consumptions',checkUserJWT,instanceConsumption);
router.post('/',checkUserJWT,()=>{
    const {user_jwt}=req.body;
    return res.status(200).json({user:user_jwt})
});

router.post('/instance/contacts',checkInstanceID,instanceContacts);

router.post('/instance/chat',checkInstanceChat,instanceChat);
router.post('/instance/message',checkInstanceMessage,instanceMessage);
router.post('/instance/media',checkInstanceMessage,instanceMedia);
router.post('/instance/send',checkInstanceSendMessage,instanceSendText);
router.post('/instance/sendmedia',checkInstanceSendMedia,instanceSendMedia);

module.exports=router