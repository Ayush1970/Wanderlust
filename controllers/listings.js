const Listing=require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken=process.env.MAP_TOKEN;
const GeocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index=async(req,res)=>{
    const allListing= await Listing.find({});
    res.render("index.ejs",{allListing});
};

module.exports.RenderNewForm=(req,res)=>{
    res.render("listings/new.ejs");
}

module.exports.showListing=async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id)
    .populate({
        path:"reviews",
        populate:{
            path:"author",
        },
    })
    .populate("owner");
    if (!listing) {
    req.flash("error","Listing you requested does not exist!");
    return res.redirect("/listings"); // ✅ stop execution
    }
    console.log(listing);
    res.render("listings/show.ejs",{listing});
}

module.exports.createListing = async (req, res, next) => {
    try {
        let response = await GeocodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
        }).send();

        if (!req.file) {
            req.flash("error", "Image upload failed");
            return res.redirect("/listings/new");
        }

        let url = req.file.path;
        let filename = req.file.filename;

        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.image = { url, filename };

        if (response.body.features.length > 0) {
            newListing.geometry = response.body.features[0].geometry;
        }

        await newListing.save();

        req.flash("success", "New Listing created!");
        return res.redirect("/listings");

    } catch (err) {
        next(err); // ✅ prevents double response
    }
};

module.exports.editRenderForm=async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if (!listing) {
    req.flash("error","Listing you requested does not exist!");
    return res.redirect("/listings"); // ✅ stop execution
    }
    let originalImageUrl=listing.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250");
    res.render("edit.ejs",{listing,originalImageUrl});
}

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    let listing = await Listing.findByIdAndUpdate(
        id,
        { ...req.body.listing },
        { new: true } // ✅ get updated document
    );

    // ✅ ADD THIS CHECK HERE
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing Updated!");
    res.redirect("/listings");
};

module.exports.destroyListing=async (req,res)=>{
    let{id}=req.params;
    let deletedListing=await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success"," Listing Deleted!");
    res.redirect("/listings");
}