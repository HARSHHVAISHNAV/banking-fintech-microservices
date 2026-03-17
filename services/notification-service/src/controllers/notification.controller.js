export const sendNotification = async(req,res) =>{
    try {
        const {type, message, account_id} = req.body;

        console.log('Notification sent :');
        console.log('Account',account_id);
        console.log('Type',type);
        console.log('Message',message);
        console.log("---------------------------");

        res.json({status:'Notification sent'});
        
    }catch(err){
        res.status(500).json({error : err.message});
    }
};