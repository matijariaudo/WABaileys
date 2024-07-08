const { Instance } = require("../database/models");


const checkCons=async(userId,mes=new Date().getMonth()+1,anio=new Date().getFullYear())=>{
    const { fi, ff,now} = obtenerTimestampsDeMes(mes,anio);
    const instances=await Instance.find({user:userId});
    const mActual=new Date().getMonth()+1;
    const aActual=new Date().getFullYear()
    const mActualCheck=mActual==mes && aActual==anio;
    const mMayorCheck=now<fi;
    const estimar=mMayorCheck || mActualCheck;
    const data=instances.map(a=>{
        let inicio=0;let fin=0;
        a.start && a.start>fi?inicio=a.start:inicio=fi;
        if(a.end && a.end<ff){
            fin=a.end
            finReal=a.end
        }else{
            fin=ff;
            mActualCheck?finReal=now:finReal=ff;
        }
        return {
            id:a.id,
            start:inicio,
            end:!mMayorCheck?finReal:undefined,
            consumption:!mMayorCheck?((finReal-inicio)/(ff-fi)):undefined,
            activeMonth:a.end<fi?false:true,
            activeNow:a.status=='active'?true:false,
            estimatedEnd:estimar?fin:undefined,
            estimatedConsumption:estimar?((fin-inicio)/(ff-fi)):undefined,
        }
    }).filter(a=>a.consumption>0 || a.estimatedConsumption>0)
    const consume = data.reduce((acumulador, obj) => {
        acumulador.consumption += obj.consumption
        acumulador.estimatedConsumption += obj.estimatedConsumption
        if(obj.activeNow){acumulador.activeInstances++}
        return acumulador;
    }, { consumption: 0, estimatedConsumption: 0 , activeInstances:0});
    return {instanceConsumptions:data,resume:consume,actual:mActualCheck,future:mMayorCheck}
}

function obtenerTimestampsDeMes(mes, año) {
    // Crear una fecha al inicio del mes (mes-1 porque los meses en JavaScript son 0-indexados)
    const inicioMes = new Date(año, mes - 1, 1);
    // Crear una fecha al fin del mes: el primer día del mes siguiente menos 1 segundo
    const finMes = new Date(año, mes, 0, 23, 59, 59);

    // Convertir las fechas a timestamps
    const fi = Math.floor(inicioMes.getTime() / 1000);
    const ff = Math.floor(finMes.getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    return { fi,ff,now};
}

module.exports={checkCons}