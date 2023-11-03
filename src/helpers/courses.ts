export const getGECType = (ge_type: string) => {
    //核心通識Core GE courses 1, 核心通識Core GE courses 2  <- return this number
    if(ge_type.includes('核心通識Core GE courses')){
        return parseInt(ge_type.slice(-1));
    }
    else return null;
}