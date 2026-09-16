import Foundation

struct SponsorBrand {
    var id:String,name:String,logo:String,required:Int,annualBase:Int
}
let sponsorSlots=["Cap","Jersey front","Jersey back","Sleeve","Team bus","Outfield board","Scoreboard","Training complex"]
// Thresholds and fees are fictional game progression, not real brand sponsorship policies.
let sponsorBrands:[SponsorBrand]=[
    .init(id:"action",name:"Action",logo:"action",required:0,annualBase:1800),
    .init(id:"lidl",name:"Lidl",logo:"lidl",required:0,annualBase:2400),
    .init(id:"aldi",name:"ALDI",logo:"aldi",required:1300,annualBase:3000),
    .init(id:"decathlon",name:"Decathlon",logo:"decathlon",required:1600,annualBase:4000),
    .init(id:"reebok",name:"Reebok",logo:"reebok",required:2000,annualBase:5500),
    .init(id:"b45",name:"B45",logo:"b45",required:2400,annualBase:7000),
    .init(id:"wilson",name:"Wilson",logo:"wilson",required:3200,annualBase:10000),
    .init(id:"rawlings",name:"Rawlings",logo:"rawlings",required:3800,annualBase:12000),
    .init(id:"marucci",name:"Marucci",logo:"marucci",required:4400,annualBase:14500),
    .init(id:"newbalance",name:"New Balance",logo:"newbalance",required:5200,annualBase:17000),
    .init(id:"puma",name:"Puma",logo:"puma",required:6000,annualBase:20000),
    .init(id:"adidas",name:"Adidas",logo:"adidas",required:7500,annualBase:25000),
    .init(id:"underarmour",name:"Under Armour",logo:"underarmour",required:9000,annualBase:30000),
    .init(id:"nike",name:"Nike",logo:"nike",required:11000,annualBase:37000),
    .init(id:"louisvuitton",name:"Louis Vuitton",logo:"louisvuitton",required:18000,annualBase:65000)
]
struct SponsorInvitation:Codable {var brandID:String,year:Int,issued:Int,expires:Int}
struct SponsorMarket:Codable {var year:Int,lastWeek:Int,offers:[SponsorInvitation]}
struct SponsorContract:Codable {
    var brandID:String,slot:Int,annual:Int,startYear:Int,years:Int,paidYears:[Int]
    var endYear:Int{startYear+years-1}
}
struct SponsorOffer {
    var brand:SponsorBrand,slot:Int,years:Int,annual:Int,firstPayment:Int
}
extension Franchise {
    var sponsors:[SponsorContract]{sponsorContracts ?? []}
    var sponsorReputation:Int{clubs[user].fans}
    func receivedSponsorBrands()->[SponsorBrand]{
        let offered=Set((sponsorMarket?.offers ?? []).filter{$0.year==year && $0.expires>=day}.map{$0.brandID})
        let signed=Set(sponsors.map{$0.brandID})
        return sponsorBrands.filter{offered.contains($0.id) && !signed.contains($0.id) && clubs[user].fans >= $0.required}
    }
    mutating func migrateSponsors(){
        let replacements=["bakker":"action","fiets":"lidl","koffie":"aldi","klus":"decathlon"]
        if sponsorContracts != nil {for i in sponsorContracts!.indices{if let id=replacements[sponsorContracts![i].brandID]{sponsorContracts![i].brandID=id}}}
        refreshSponsorMarket()
    }
    mutating func refreshSponsorMarket(){
        guard !draft,champion==nil else{return}
        if sponsorMarket==nil || sponsorMarket!.year != year {
            sponsorMarket=SponsorMarket(year:year,lastWeek:day/7,offers:[])
            if let entry=sponsorBrands.first(where:{brand in clubs[user].fans >= brand.required && !sponsors.contains(where:{$0.brandID==brand.id})}) { offerSponsor(entry.id) }
            return
        }
        let activeBrands=Set(sponsors.map{$0.brandID});sponsorMarket!.offers.removeAll{$0.expires<day || activeBrands.contains($0.brandID)}
        let week=day/7
        guard week>=sponsorMarket!.lastWeek+2 else{return}
        sponsorMarket!.lastWeek=week
        guard sponsorMarket!.offers.count<3 else{return}
        let signed=Set(sponsors.map{$0.brandID}),pending=Set(sponsorMarket!.offers.map{$0.brandID})
        let candidates=sponsorBrands.filter{clubs[user].fans >= $0.required && !signed.contains($0.id) && !pending.contains($0.id)}
        guard !candidates.isEmpty else{return}
        let shortlist=Array(candidates.suffix(4)),index=(year+user+week/2)%shortlist.count
        offerSponsor(shortlist[index].id)
    }
    mutating func offerSponsor(_ id:String){
        guard let b=sponsorBrands.first(where:{$0.id==id})else{return}
        sponsorMarket?.offers.append(SponsorInvitation(brandID:id,year:year,issued:day,expires:day+28))
        log("SPONSOR OFFER: \(b.name) has approached the club. Review within four weeks in Club → Sponsors.")
    }
    func sponsorOffer(_ brand:SponsorBrand,slot:Int)->SponsorOffer {
        let index=sponsorBrands.firstIndex{$0.id==brand.id} ?? 0
        let roll=(year*17+user*11+slot*7+index*13)%20
        let term=roll==0 ? 3:(roll<6 ? 2:1)
        let multiplier=[1.0,1.7,1.3,0.8,1.1,0.9,1.2,0.75][slot]
        let annual=Int(Double(brand.annualBase)*multiplier*(term==3 ? 0.90:term==2 ? 0.95:1))
        let fraction=max(0,min(1,Double(168-day)/168))
        return SponsorOffer(brand:brand,slot:slot,years:term,annual:annual,firstPayment:Int(Double(annual)*fraction))
    }
    @discardableResult mutating func signSponsor(_ brandID:String,slot:Int)->Bool {
        guard sponsorSlots.indices.contains(slot),!draft,champion==nil,let brand=sponsorBrands.first(where:{$0.id==brandID}),receivedSponsorBrands().contains(where:{$0.id==brandID}),
              !sponsors.contains(where:{$0.slot==slot || $0.brandID==brandID}) else{return false}
        let offer=sponsorOffer(brand,slot:slot)
        sponsorContracts=sponsors+[SponsorContract(brandID:brandID,slot:slot,annual:offer.annual,startYear:year,years:offer.years,paidYears:[year])]
        sponsorMarket?.offers.removeAll{$0.brandID==brandID}
        clubs[user].cash+=offer.firstPayment;clubs[user].income+=offer.firstPayment
        ledger.insert("\(dateLabel(day)): \(brand.name) sponsorship +€\(offer.firstPayment)",at:0)
        log("SPONSOR: \(brand.name) on \(sponsorSlots[slot]) until end \(year+offer.years-1). €\(offer.annual)/year.")
        return true
    }
    mutating func renewSponsorYear(){
        let expired=sponsors.filter{$0.endYear<year}
        for contract in expired{log("SPONSOR EXPIRED: \(sponsorBrands.first{$0.id==contract.brandID}?.name ?? contract.brandID). \(sponsorSlots[contract.slot]) is available again.")}
        sponsorContracts=sponsors.filter{$0.endYear>=year}
        for i in (sponsorContracts ?? []).indices where !sponsorContracts![i].paidYears.contains(year) {
            let contract=sponsorContracts![i];clubs[user].cash+=contract.annual;clubs[user].income+=contract.annual;sponsorContracts![i].paidYears.append(year)
            ledger.insert("\(year): annual sponsor payment \(contract.brandID) +€\(contract.annual)",at:0)
        }
    }
}
