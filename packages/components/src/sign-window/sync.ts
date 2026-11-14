export const DRIFT_THRESHOLD_SECONDS=0.3;

export function signTargetTime(mainTime:number,offsetMs:number){return Math.max(0,mainTime-offsetMs/1000);}

export function needsDriftCorrection(signTime:number,mainTime:number,offsetMs:number){return Math.abs(signTime-signTargetTime(mainTime,offsetMs))>DRIFT_THRESHOLD_SECONDS+1e-9;}
