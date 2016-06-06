$(document).ready( function() {
		
	var padding = 20;
	var extra_padding = 80;
	
	var KEY = {
		A: 97,
		S: 115
	};
	
	// Our visualization structures
	var titles_of = {};
	var mentions_of = {};
	var nodes = [];
	var links = [];
	
	/// Parse and process data for visualization
	
	// Parse string data from the html element
	var str_data = $('.project-data').html();
	// Projects are delimited by two line breaks
	var projects = str_data.split('\n\n');
	
	// get the initials from a name in the format "Firstname Surname"
	// so "Firstname Surname" results in "FS"
	var get_initials = function(name) {
		var names = name.split(" ");
		var initials_str = "";
		$.each( names, function( idx, name_str ) {
			initials_str += name_str.substring( 0, 1 );
		} );
		if (initials_str == 'p') return '';
		return initials_str;
	};
	
	// String with roman alphabets, used to get an
	// integer representation of a character
	var alphabetString = 'abcdefghijklmnopqrstuvwxyzåäö';
	
	// Convert initials to integer values
	var convert_initials_to_int = function(initials_str) {
		console.log('got initials str: ' + initials_str);
		if ( initials_str.length < 1 ) return 1;
		
		var initials = initials_str.split('');
		var initials_int_str = '';
		$.each( initials, function( idx, initial ) {
			initial = initial.toLowerCase();
			var indexof =  alphabetString.indexOf(initial);
			console.log(initial + ' : ' + indexof );
			initials_int_str += indexof;
		} );
		
		var initial_int = parseInt(initials_int_str);
		console.log('initial int is ' + initial_int);
		return initial_int;
	};
	
	// Add name and title to our visualization structures
	var add_name_and_title = function( name, title, project_index, project_node_index, link_value ) {
		
		if (name == "Matt Pyke") return; // Don't add Matt since he is in every project anyway
		
		// Simple increment of mentions
		if ( !mentions_of[name] ) {
			mentions_of[name] = 0;
		}
		mentions_of[name] = mentions_of[name] + 1;
		
		if(!titles_of[name]) {
			titles_of[name] = {};
		}
		var counts_of = titles_of[name];
		if ( !counts_of[title] ) {
			counts_of[title] = 0;
		}
		counts_of[title] = counts_of[title] + 1;

		var initials = get_initials(name);
		
		// Add node
		nodes.push({
			name: name,
			title: title,
			group: convert_initials_to_int(initials),
			size: 10
		});
		// Add a link from added node to project node
		links.push({
			source: nodes.length - 1,
			target: project_node_index,
			value: link_value
		});
		
		return;
	};
	
	// Split strings that have " and " in the middle
	// That is, "Tom and Sam" becomes two strings: "Tom", "Sam"
	var do_and_split = function( title, str, project_index, project_node_index, link_value ) {
		if ( str.indexOf(' and ') > 0 ) {
			var names = str.split(' and ');
			$.each( names, function( name_idx, name_str) {
				add_name_and_title( name_str.trim(), title, project_index, project_node_index, link_value );
			} );
		} else {
			add_name_and_title( str, title, project_index, project_node_index, link_value );
		}
	};
	
	// Split the
	console.log('projects: ' + projects.length );
	$.each(projects, function( project_index, project_str ) {
		var contributor_lines = project_str.split('\n');
		
		// Add a node for the project
		// This is also representing "Matt Pyke" 
		nodes.push({
			name: 'project_' + project_index,
			group: project_index,
			size: 10,
			color: 'red'
		});
		var project_node_index = nodes.length - 1;
		
		// Process the different contributors
		// These are Title and Name pairings delimited by ":"
		// For example: "Creative Director : Matt Pyke"
		$.each( contributor_lines, function(line_index, contributor_str) {
			var title_and_name = contributor_str.split(':');
			if(title_and_name.length < 2) return;
			
			var title = title_and_name[0].trim();
			var name = title_and_name[1].trim();
			// Sometimes there will be multiple names for a certain title,
			// such as "Developers: Name1 / Name2 / Name3 ..."
			// So we need to split by "/"
			if ( name.indexOf("/") > 0 ) {
				var names = name.split("/");
				$.each( names, function(name_idx, name_str) {
					console.log('1 got title ' + title + ' and name ' + name);
					do_and_split( title, name_str.trim(), project_index, project_node_index, Math.floor( 20 / names.length ) + 1 );
				} );
			} else {
				console.log('2 got title ' + title + ' and name ' + name);
				do_and_split( title, name, project_index, project_node_index, 20 );
			}
		});
	});
	
	var min_size = 10;
	var size_multiplier = 3;
	var max_size = min_size + size_multiplier * projects.length;
	
	// Increment a person's node size for each time that person
	// is mentioned as a contributor in projects
	$.each( nodes, function(index, node) {
		if(!mentions_of[node.name]) return;
		var size = 10 + 3 * mentions_of[node.name];
		node.size = size;
	});
	
	// Create d3 compatible data
	var graph = {};
	graph.nodes = nodes;
	graph.links = links;
	
	// Create force layout
	var color = d3.scale.category20();
	var force = d3.layout.force()
			.charge(-200)
			.linkDistance(80)
			.size([ $(window).width(), $(window).height() ]);

	// Make SVG 
	var svg = d3.select('.project-visualization').append('svg')
		.attr('width', $(window).width() )
		.attr('height', $(window).height() );

	// Create the links (lines) between nodes
	var link = svg.selectAll('.link')
		.data(graph.links)
		.enter().append('line')
		.attr('class', 'link')
		.style('stroke-width', function(d) { return Math.sqrt(d.value); } );
	
	// Create the groups for circles
	var node_group = svg.selectAll('.node')
		.data(graph.nodes)
		.enter().append('g')
		.attr('class', 'node')
		.call(force.drag);

	// Add a circle
	node_group
		.append('circle')
		.attr('class', 'circle')
		.attr('r', function(d) { return d.size; } )
		.style('fill', function(d) { 
			if(!d.color) {
				return d3.hsl(0, 0, 1 - d.size / max_size );
			}
			return d.color;
		});
	
	// Add a title
	node_group.append('title')
		.text( function(d) { return d.name; });
	
	var force_started = false;
	var start_force = function() {
		if(force_started) return;
		
		force_started = true;
		force
			.nodes(graph.nodes)
			.links(graph.links)
			.start();
	
		// Tell the force function what to 
		force.on('tick', function() {
			
			link.attr('x1', function(d) { return d.source.x; })
				.attr('y1', function(d) { return d.source.y; })
				.attr('x2', function(d) { return d.target.x; })
				.attr('y2', function(d) { return d.target.y; });
			
			node_group
				.attr( 'transform', function(d) {
					return "translate(" + d.x + "," + d.y + ")";
				} );
			
		});	
	};
	// Start the force already
	start_force();
	
	
	var resize = function() {
		
		// Section resizing
		$('.section').each( function(index, el) {
			$(el).css({
				width: $(window).width() + 'px',
				height: $(window).height() + 'px',
				padding: padding + 'px',
				position: 'relative'
			});
		});
		
		// d3 element resizing
		svg
			.attr('width', $(window).width() )
			.attr('height', $(window).height() );
		force
			.size([ $(window).width(), $(window).height() ]);
		
		// Full screen element resizing
		$('.full').each( function( idx, el) {
			$(el).css({
				width: $(window).width() -2*padding + 'px',
				height: $(window).height() - 2*padding + 'px'
			});
		})
		
		// Vertical center elements repositioning
		$('.vcenter').each( function( idx, el ) {
			$(el).css({
				position: 'absolute',
				top: '50%',
				'margin-top': - $(el).height() / 2 - 25 + 'px',
				width: $(window).width() - 2*padding + 'px'
			});
		});
		
		// Apply extra padding
		$('.extra-pad').each( function(idx, el) {
			$(el).css({
				padding: extra_padding + 'px'
			});
		})
		
	};
	
	// Connect our resize function to window resize
	$(window).on('resize', function() {
		resize();
	});
	resize();
	
	// Initial state
	$(window).scrollTop(0);
	var current_index = 0;
	
	// Go to next section
	var scroll_to_next = function(direction_modifier) {
		console.log('scroll ' + direction_modifier);
		
		var next_index = current_index + direction_modifier;
		
		if ( next_index < 0 ) return;
		if ( next_index > $('.section').length - 1 ) return;
		
		var next_section = $('.section')[next_index];
		
		if ( $(next_section).hasClass('project-visualization') && !force_started ) {
			// Start the force on the visualization section when we reach it the first time
			start_force();
		}
		
		next_section.scrollIntoView({
			behavior: 'smooth'
		});
		
		current_index = next_index;
		
	};
	
	// Listen to keypress events for keys A and S
	var on_keypress = function(event) {
		var self = this;
		var key = event.which;
		if ( key == KEY.A || key == KEY.S ) {
			switch(key) {
				case KEY.A:
					scroll_to_next(-1);
					break;
				case KEY.B:
				default:
					scroll_to_next(1);
					break;
			}
		}
		return;
	};
	$(document).bind( 'keypress', on_keypress );
	
});