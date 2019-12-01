
defineThreeUniverse(function (THREE, UNIVERSE, options) {





    var GroundMaterial = function (parameters, others) {

        THREE.MeshPhongMaterial.call(this, parameters);

    }

    GroundMaterial.prototype = Object.create(THREE.MeshPhongMaterial.prototype);

    GroundMaterial.prototype.onBeforeCompile = function (shader) {

        this.uniforms = shader.uniforms;



        shader.vertexShader = `
        #define PHONG
        varying vec3 vViewPosition;
        #ifndef FLAT_SHADED
            varying vec3 vNormal;
        #endif
        #include <common>
        #include <uv_pars_vertex>
        #include <uv2_pars_vertex>
        #include <displacementmap_pars_vertex>
        #include <envmap_pars_vertex>
        #include <color_pars_vertex>
        #include <fog_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <skinning_pars_vertex>
        #include <shadowmap_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>
        void main() {
            #include <uv_vertex>
            #include <uv2_vertex>
            #include <color_vertex>
            #include <beginnormal_vertex>
            #include <morphnormal_vertex>
            #include <skinbase_vertex>
            #include <skinnormal_vertex>
            #include <defaultnormal_vertex>
        #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
            vNormal = normalize( transformedNormal );
        #endif
            #include <begin_vertex>
            #include <morphtarget_vertex>
            #include <skinning_vertex>
            #include <displacementmap_vertex>
            #include <project_vertex>
            #include <logdepthbuf_vertex>
            #include <clipping_planes_vertex>
            vViewPosition = - mvPosition.xyz;
            #include <worldpos_vertex>
            #include <envmap_vertex>
            #include <shadowmap_vertex>
            #include <fog_vertex>
        }
        `
        shader.fragmentShader = `
        #define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	// accumulation
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	// modulation
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
        `

    }


































    
    return new Promise(function (resolve, reject) {

        var groundTexturePromise = UNIVERSE.TextureLoader.load(options.baseUrl + 'resource/grasslight-big.jpg');
        var queryTexturePromise = UNIVERSE.TextureLoader.load(options.baseUrl +'resource/texture/sECkYCE.png').then(heightmap => new UNIVERSE.QueryTextureWrapper(heightmap));
        var geometry = new THREE.PlaneBufferGeometry(20000, 20000, 100, 100);


        Promise.all([groundTexturePromise, queryTexturePromise]).then((textures) => {

            var groundTexture = textures[0];
            groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
            groundTexture.repeat.set(25, 25);
            groundTexture.anisotropy = 16;

            var queryTexture= textures[1];
            var displacementMap = queryTexture.texture;


            var material = new GroundMaterial({
                displacementMap: displacementMap,
                displacementScale: 400,
                displacementBias: -100,
                side: THREE.DoubleSide,
                map: groundTexture,
                aoMap:displacementMap,
                aoMapIntensity:1 
            });

            var mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = - Math.PI / 2;
            mesh.receiveShadow = true;

            

            var originalRaycast = mesh.raycast;
            mesh.raycast = function (raycaster, intersects) {
                originalRaycast.call(mesh, raycaster, intersects);
                var thisobjectsIntersects = intersects.filter((element) => element.object == mesh);
                if (thisobjectsIntersects.length) {
                    let uv = new THREE.Vector2().copy(thisobjectsIntersects[0].uv);
                    displacementMap.transformUv(uv);
                    var hightpixel = queryTexture.getPixelAtUv(uv.x, uv.y);
                    var hightVal = hightpixel.r / 255 * material.displacementScale + material.displacementBias;
                }

                thisobjectsIntersects.forEach(element => {
                    element.point.y = hightVal;

                });



            }

            UNIVERSE.GroundManager.add(mesh);
            resolve(mesh);

        });






    });


});