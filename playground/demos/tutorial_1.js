module.exports = `/* __--__--__--__--__--__--__--__--
                                    
let's start by making a simple     
scene with one sphere.  highlight   
the lines below and hit ctrl+enter 
to run them. make sure not to high- 
light these instructions. you can  
also hit alt+enter (option in macOS)
to run an entire block at once. use
ctrl+. (period) to clear graphics.  
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere()
 
march( sphere1 )
  .render( 2, true )

/* __--__--__--__--__--__--__--__--
                                    
the march() method accepts an array
of objects that can be geometric    
primitives or transformations. we  
can now change the radius of our    
sphere:                            
                                    
** __--__--__--__--__--__--__--__*/

sphere1.radius = 1.25

/* __--__--__--__--__--__--__--__--
                                    
or its center point...note that the
center point is a three-item vector 
(for x,y, and z position), whereas 
radius was a single float.          
                                   
** __--__--__--__--__--__--__--__*/

sphere1.center.x = .5
sphere1.center.y = -.5

/* __--__--__--__--__--__--__--__--
                                    
note that we can only make these   
changes after the initial render if 
a value of true is passed to our   
render function as its second       
parameter. Depending on the        
computer you use, you probably will 
want to turn the resolution down   
(the first arg) when animating the  
scene. If no value or a value of   
false is passed as the second       
argument, marching.js will create a
static image at maximum quality.   
                                    
we can also register a callback to 
change properties over time. these  
run once per video frame, and are  
passed the current time. here we'll 
use the time to change the sphere's
position.                           
                                   
** __--__--__--__--__--__--__--__*/

callbacks.push( time => {
  sphere1.center.z = -10 + Math.sin( time ) * 10
  sphere1.center.x = Math.sin( time * 2.5 ) * 4
})

/* __--__--__--__--__--__--__--__--
                                    
this library uses signed distance  
functions (SDFs) to render geometry 
and perform transformations. You   
can do fun stuff with SDFs. Below   
we'll render a box, but subtract a 
sphere from its center.             
                                   
** __--__--__--__--__--__--__--__*/

march( 
  Difference( 
    Box(), Sphere( 1.35 ) 
  )
)
.render()

/* __--__--__--__--__--__--__--__--
                                    
we can animate this as well. we'll 
turn down the quality first...      
try turning it back up and see if  
your computer can handle it.        
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere( 1.35 )
box1 = Box()
 
march(
  Difference( box1, sphere1 )
)
.render( 2, true )
 
callbacks.push( time => 
  sphere1.radius = 1.25 + Math.sin( time ) * .1 
)

/* __--__--__--__--__--__--__--__--
                                    
One fun transform we can do is to  
repeat a shape throughout our scene,
We can define how coarse/fine these
repetitions are.                    
                                   
** __--__--__--__--__--__--__--__*/

march(  
  Repeat( 
    Sphere( .25 ),
    Vec3( 1 )
  ) 
) 
.render()

/* __--__--__--__--__--__--__--__--
                                    
The vector we pass as the second   
argument to repeat determines the   
spacing; higher numbers yield fewer
repeats. What if we want to take two
shapes and repeat them? In order to
do that we need to create a union.  
                                   
** __--__--__--__--__--__--__--__*/

sphere1 = Sphere( .35 )
box1 = Box( Vec3( .35 ) ) 
sphereBox = SmoothUnion( sphere1, box1, .9 )
 
march(  
  Repeat( sphereBox, Vec3( 2,2,2 ) )
) 
.render( 3, true )
 
callbacks.push( time => sphere1.radius = Math.sin( time ) * .75 )

/* __--__--__--__--__--__--__--__--
                                    
Hopefully your computer can handle 
that, but if not, you can always    
lower the resolution further or    
shrink your browser window. Lowering
your monitor resolution while doing
realtime experiments or performances
will also help (especially with    
hidpi or "retina" displays). in     
addition to improving efficiency,  
we can also change the performance  
of our raymarcher to get fun glitch
effects.                            
                                   
** __--__--__--__--__--__--__--__*/

march(  
  Sphere( Noise() )
)
// halve the resolution
.resolution(.5)
// only take one sample per ray
.steps(1)
// how far do our rays go?
.farPlane(10)
// ignore quality parameter in favor
// of the other settings we've defined
// and animate
.render(null, true)
`
