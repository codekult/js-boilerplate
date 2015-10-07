let commonMockModule = {};

commonMockModule.sayHi = name => {
    console.warn(`Hi ${name}!`);
};

export default commonMockModule;
