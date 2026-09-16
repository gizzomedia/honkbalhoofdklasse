// swift-tools-version: 6.4
import PackageDescription
let package = Package(name:"HoofdklasseFranchise",products:[.executable(name:"Franchise",targets:["Franchise"])],targets:[
 .executableTarget(name:"Franchise",path:".",exclude:["Native","Tests","PORT-ACCEPTATIE.md"],sources:["Adapter","Generated","Entry.swift"],swiftSettings:[.swiftLanguageMode(.v5)],linkerSettings:[.unsafeFlags(["-Xclang-linker","-mexec-model=reactor","-Xlinker","--export=hk_alloc","-Xlinker","--export=hk_free","-Xlinker","--export=hk_dispatch","-Xlinker","--export=hk_result_length","-Xlinker","-z","-Xlinker","stack-size=4194304"])])
])
